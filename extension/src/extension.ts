import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { execFileSync } from 'child_process';
import { syncTokenWatchHook, getStateFilePath, getProgressFilePath } from './hookManager';

// KCLOUD VM 배포 주소. CSP connect-src에 없으면 online 모드 fetch가 조용히 막힌다
// (에러가 안 뜨고 그냥 요청이 안 나감 — docs/ARCHITECTURE.md 리소스 로딩 참고).
const VM_ORIGIN = 'https://vibehit.backend.madcamp-kaist.org';

interface GameContext {
  mode: 'local' | 'online';
  groupId: string | null;
  userName: string;
  // false면 실제로 아는 이름이 없어(globalState도, git user.name도 없어) 'player'로 폴백했다는 뜻.
  // online 모드에서 이 값이 false일 때만 webview가 이름 입력 모달을 띄운다.
  hasUserName: boolean;
}

// docs/API.md groupId 해싱과 반드시 동일해야 한다 (서버는 이 값을 재계산하지 않고 그대로 저장/조회).
function computeGroupId(repoUrl: string): string {
  return crypto.createHash('sha256').update(repoUrl).digest('hex').slice(0, 12);
}

function readGitConfig(cwd: string, key: string): string | null {
  try {
    const value = execFileSync('git', ['config', '--get', key], { cwd, encoding: 'utf8' }).trim();
    return value || null;
  } catch {
    return null; // git 미설치, repo 아님, 설정 없음 — 전부 local 취급으로 수렴
  }
}

// git remote 유무로 online/local 판별 (docs/ARCHITECTURE.md 모드 분기). remote 없으면 groupId도 없음.
// userName은 이전에 사용자가 직접 입력해 globalState에 저장해둔 이름을 최우선으로 쓰고,
// 없으면 git user.name, 그것도 없으면 'player'로 폴백한다 (git remote가 있어도 user.name은 없을 수 있음).
// hasUserName은 그 폴백 여부를 그대로 담아 webview에 전달 — online인데 이 값이 false일 때만 모달을 띄우게 한다.
function resolveGameContext(context: vscode.ExtensionContext, cwd: string): GameContext {
  const repoUrl = readGitConfig(cwd, 'remote.origin.url');
  const savedUserName = context.globalState.get<string>('userName');
  const gitUserName = readGitConfig(cwd, 'user.name');
  const userName = savedUserName || gitUserName || 'player';
  const hasUserName = Boolean(savedUserName || gitUserName);

  if (!repoUrl) {
    return {
      mode: 'local', groupId: null, userName, hasUserName,
    };
  }
  return {
    mode: 'online', groupId: computeGroupId(repoUrl), userName, hasUserName,
  };
}

let currentPanel: vscode.WebviewPanel | undefined;

// Stop 훅(extension/scripts/token-watch-hook.js)이 토큰 임계치 초과 시 남겨두는 1회성 이벤트를 읽어 소비한다.
// 소비 즉시 파일을 지워 같은 이벤트가 중복 발동하지 않게 한다.
function consumePendingTaunt(workspaceRoot: string): { tokenCount: number } | null {
  const statePath = getStateFilePath(workspaceRoot);
  if (!fs.existsSync(statePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    fs.unlinkSync(statePath);
    if (data?.triggered) return { tokenCount: data.tokenCount ?? 0 };
  } catch {
    try {
      fs.unlinkSync(statePath); // 손상된 상태 파일은 무시하고 지운다
    } catch {
      /* noop */
    }
  }
  return null;
}

export function activate(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  // Stop 훅 on/off 토글: 설정값과 .claude/settings.local.json 상태를 activate 시점 + 설정 변경 시점에 동기화.
  // 워크스페이스가 열려 있을 때만 의미가 있다 (훅은 프로젝트 로컬 파일에 등록되므로).
  if (workspaceFolder) {
    const workspaceRoot = workspaceFolder.uri.fsPath;
    syncTokenWatchHook(context, workspaceRoot);
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration('hitTheAgent.enableTokenWatchHook') ||
          e.affectsConfiguration('hitTheAgent.tokenThreshold')
        ) {
          syncTokenWatchHook(context, workspaceRoot);
        }
      }),
    );
  }

  const disposable = vscode.commands.registerCommand('HitTheAgent.start', () => {
    const cwd = workspaceFolder?.uri.fsPath ?? process.cwd();
    const gameContext = resolveGameContext(context, cwd);
    console.log('[HitTheAgent] gameContext', gameContext); // 확인용 — 디버그 콘솔에서 mode/groupId 검증되면 지워도 됨

    // local 모드 결과 화면에서 "내 최고 기록"과 비교할 기준값. online 모드에서는 webview가 무시한다.
    const bestScore = context.globalState.get<number>('bestScore', 0);
    const pendingTaunt = consumePendingTaunt(cwd);

    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.One);
      currentPanel.webview.postMessage({ type: 'init', ...gameContext, bestScore });
      if (pendingTaunt) {
        currentPanel.webview.postMessage({ type: 'agentTaunt', tokenCount: pendingTaunt.tokenCount });
      }
      return;
    }

    // 게임을 새로 켤 때마다 이전 진행 상황(세션별 오프셋/누적 토큰)을 리셋한다 — 재실행 시 초기화는
    // 신경 쓰지 않아도 되는 대신, 파일이 계속 안 쌓이고 항상 켠 시점부터의 토큰만 추적하게 된다.
    try {
      fs.unlinkSync(getProgressFilePath(cwd));
    } catch {
      /* 파일이 없으면 그냥 넘어간다 */
    }

    // vite build 산출물 위치. extension/scripts/copy-webview.mjs가 frontend/dist를 여기로 복사해둔다
    // (vsix로 패키징하면 extension이 frontend와 다른 폴더에 설치되므로 '../frontend/dist'는 못 찾는다).
    const distUri = vscode.Uri.file(path.join(context.extensionPath, 'media'));

    currentPanel = vscode.window.createWebviewPanel(
      'HitTheAgent',
      'Hit the Agent',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [distUri],
      },
    );

    currentPanel.webview.html = getWebviewHtml(currentPanel.webview, distUri);

    // webview → extension (docs/FRONTEND.md 메시지 프로토콜): local 모드 최고점수 저장 / 리더보드 제출용 이름 저장
    const messageListener = currentPanel.webview.onDidReceiveMessage((message) => {
      if (message?.type === 'saveLocalScore' && typeof message.score === 'number') {
        const best = context.globalState.get<number>('bestScore', 0);
        if (message.score > best) {
          context.globalState.update('bestScore', message.score);
        }
        return;
      }
      // 이름 입력 UI는 webview(게임 화면) 안에서 직접 띄운다 — extension은 확정된 값만 받아 다음 판 prefill용으로 저장.
      if (message?.type === 'saveUserName' && typeof message.userName === 'string' && message.userName.trim()) {
        context.globalState.update('userName', message.userName.trim());
      }
    });

    // 패널이 열려 있는 동안 상태 파일 변경(=Stop 훅 발동)을 실시간으로 감지 — 다음에 게임을 다시 켤 때까지
    // 기다리지 않고 그 자리에서 바로 webview에 전달한다. 디렉터리가 아직 없을 수 있어 미리 만들어둔다.
    const stateDir = path.dirname(getStateFilePath(cwd));
    const stateFileName = path.basename(getStateFilePath(cwd));
    fs.mkdirSync(stateDir, { recursive: true });
    const stateWatcher = fs.watch(stateDir, (_eventType, filename) => {
      if (filename !== stateFileName) return;
      const taunt = consumePendingTaunt(cwd);
      if (taunt) {
        currentPanel?.webview.postMessage({ type: 'agentTaunt', tokenCount: taunt.tokenCount });
      }
    });

    currentPanel.onDidDispose(
      () => {
        messageListener.dispose();
        stateWatcher.close();
        currentPanel = undefined;
      },
      null,
      context.subscriptions,
    );

    // 웹뷰 생성 직후 1회 전달 — webview는 이 값을 그대로 신뢰하고 자체 판별하지 않는다.
    currentPanel.webview.postMessage({ type: 'init', ...gameContext, bestScore });
    if (pendingTaunt) {
      currentPanel.webview.postMessage({ type: 'agentTaunt', tokenCount: pendingTaunt.tokenCount });
    }
  });

  context.subscriptions.push(disposable);
}

function getWebviewHtml(webview: vscode.Webview, distUri: vscode.Uri): string {
  const bundleUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'bundle.js'));
  // dist 폴더 전체를 webview가 신뢰하는 vscode-webview:// 스킴으로 미리 변환해 전역 변수로 심어둔다.
  // 효과음 등 정적 에셋은 이 base 뒤에 상대경로만 붙이면 되고(frontend/src/assetBase.js), 새 파일을
  // dist에 추가할 때마다 extension.ts를 매번 고칠 필요가 없다 (CLAUDE.md webview 리소스 불변 조건).
  const assetBaseUri = webview.asWebviewUri(distUri);
  // frontend/public/fonts에 있던 파일이 vite build 시 dist/fonts로 그대로 복사된다 (Galmuri11, OFL 라이선스).
  const fontRegularUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'fonts', 'Galmuri11.woff2'));
  const fontBoldUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'fonts', 'Galmuri11-Bold.woff2'));
  // default-src 'none' 기준이라 나머지를 전부 명시적으로 허용해야 한다.
  const csp = [
    "default-src 'none'",
    `script-src ${webview.cspSource}`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `font-src ${webview.cspSource}`,
    `connect-src ${webview.cspSource} ${VM_ORIGIN}`,
    // Phaser가 내부 기본 텍스처(__DEFAULT/__MISSING 등)를 base64 data URI로 로드한다 —
    // img-src를 안 열어두면 default-src 'none'에 막혀 조용히 실패하고 텍스처 프레임이 없어 크래시난다.
    `img-src ${webview.cspSource} data:`,
    // 효과음 재생(Phaser Sound Manager)이 HTML5Audio로 폴백할 때 <audio> 태그가 media-src를 탄다.
    `media-src ${webview.cspSource}`,
  ].join('; ');

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <style>
      @font-face {
        font-family: 'Galmuri11';
        font-weight: 400;
        font-display: swap;
        src: url('${fontRegularUri}') format('woff2');
      }
      @font-face {
        font-family: 'Galmuri11';
        font-weight: 700;
        font-display: swap;
        src: url('${fontBoldUri}') format('woff2');
      }
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #111; overflow: hidden; }
      #game-container { display: flex; justify-content: center; align-items: center; width: 100%; height: 100vh; overflow: hidden; }
      #game-stage { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body data-asset-base="${assetBaseUri}">
    <div id="game-container">
      <div id="game-stage"></div>
    </div>
    <script type="module" src="${bundleUri}"></script>
  </body>
</html>`;
}

export function deactivate() {}
