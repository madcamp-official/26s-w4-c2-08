import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import { execFileSync } from 'child_process';

// KCLOUD VM 배포 주소. CSP connect-src에 없으면 online 모드 fetch가 조용히 막힌다
// (에러가 안 뜨고 그냥 요청이 안 나감 — docs/ARCHITECTURE.md 리소스 로딩 참고).
const VM_ORIGIN = 'https://vibehit.backend.madcamp-kaist.org';

interface GameContext {
  mode: 'local' | 'online';
  groupId: string | null;
  userName: string;
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
function resolveGameContext(cwd: string): GameContext {
  const repoUrl = readGitConfig(cwd, 'remote.origin.url');
  const userName = readGitConfig(cwd, 'user.name') || 'player';

  if (!repoUrl) {
    return { mode: 'local', groupId: null, userName };
  }
  return { mode: 'online', groupId: computeGroupId(repoUrl), userName };
}

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('bossClicker.start', () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const cwd = workspaceFolder?.uri.fsPath ?? process.cwd();
    const gameContext = resolveGameContext(cwd);
    console.log('[bossClicker] gameContext', gameContext); // 확인용 — 디버그 콘솔에서 mode/groupId 검증되면 지워도 됨

    // local 모드 결과 화면에서 "내 최고 기록"과 비교할 기준값. online 모드에서는 webview가 무시한다.
    const bestScore = context.globalState.get<number>('bestScore', 0);

    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.One);
      currentPanel.webview.postMessage({ type: 'init', ...gameContext, bestScore });
      return;
    }

    // vite build 산출물 위치. frontend/vite.config.js에서 entry 파일명을 bundle.js로 고정해뒀다.
    const distUri = vscode.Uri.file(path.join(context.extensionPath, '..', 'frontend', 'dist'));

    currentPanel = vscode.window.createWebviewPanel(
      'bossClicker',
      'Boss Clicker',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [distUri],
      },
    );

    currentPanel.webview.html = getWebviewHtml(currentPanel.webview, distUri);

    // ⭐ 포커스/활성 상태 감지 — 패널 생성 시점에 두 리스너 모두 등록 (docs/ARCHITECTURE.md 포커스 감지)
    // active(실제 포커스된 탭인지)로 판단해야 한다 — visible은 터미널/채팅 패널처럼 에디터 영역
    // 밖으로 포커스만 옮겨도 true로 남아있어서(웹뷰 탭 자체는 화면에 계속 보이므로) 감지가 안 됨.
    const viewStateListener = currentPanel.onDidChangeViewState((e) => {
      currentPanel?.webview.postMessage({ type: 'setPaused', paused: !e.webviewPanel.active });
    });
    const windowStateListener = vscode.window.onDidChangeWindowState((state) => {
      currentPanel?.webview.postMessage({ type: 'setPaused', paused: !state.focused });
    });

    // webview → extension (docs/FRONTEND.md 메시지 프로토콜): local 모드 최고점수 저장
    const messageListener = currentPanel.webview.onDidReceiveMessage((message) => {
      if (message?.type === 'saveLocalScore' && typeof message.score === 'number') {
        const best = context.globalState.get<number>('bestScore', 0);
        if (message.score > best) {
          context.globalState.update('bestScore', message.score);
        }
      }
    });

    currentPanel.onDidDispose(
      () => {
        viewStateListener.dispose();
        windowStateListener.dispose();
        messageListener.dispose();
        currentPanel = undefined;
      },
      null,
      context.subscriptions,
    );

    // 웹뷰 생성 직후 1회 전달 — webview는 이 값을 그대로 신뢰하고 자체 판별하지 않는다.
    currentPanel.webview.postMessage({ type: 'init', ...gameContext, bestScore });
  });

  context.subscriptions.push(disposable);
}

function getWebviewHtml(webview: vscode.Webview, distUri: vscode.Uri): string {
  const bundleUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'bundle.js'));
  // default-src 'none' 기준이라 나머지를 전부 명시적으로 허용해야 한다.
  const csp = [
    "default-src 'none'",
    `script-src ${webview.cspSource}`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `connect-src ${webview.cspSource} ${VM_ORIGIN}`,
    // Phaser가 내부 기본 텍스처(__DEFAULT/__MISSING 등)를 base64 data URI로 로드한다 —
    // img-src를 안 열어두면 default-src 'none'에 막혀 조용히 실패하고 텍스처 프레임이 없어 크래시난다.
    `img-src ${webview.cspSource} data:`,
  ].join('; ');

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <style>
      html, body { margin: 0; padding: 0; background: #111; }
      #game-container { display: flex; justify-content: center; }
      #game-stage { position: relative; }
      #pause-overlay {
        display: none;
        position: absolute;
        inset: 0;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
        font-size: 20px;
        font-weight: bold;
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div id="game-container">
      <div id="game-stage">
        <div id="pause-overlay">일시정지</div>
      </div>
    </div>
    <script type="module" src="${bundleUri}"></script>
  </body>
</html>`;
}

export function deactivate() {}
