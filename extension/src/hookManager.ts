import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// 확률적으로 게임 캐릭터가 말을 걸 확률. 세션 누적 토큰이 threshold를 넘긴 턴부터 매 턴 이 확률로 재도전한다.
// TODO 테스트 후 0.3 정도로 되돌리기 — 지금은 실측 테스트가 매번 확실히 발동하도록 1로 임시 고정해둔 상태.
const TRIGGER_CHANCE = 1;
// 우리가 심은 Stop 항목인지 식별하는 마커 — 커맨드 문자열에 이 스크립트 경로가 포함돼 있는지로 판단한다.
const HOOK_SCRIPT_NAME = 'token-watch-hook.js';

interface ClaudeHookEntry {
  hooks: Array<{ type: string; command: string }>;
}

interface ClaudeSettings {
  hooks?: {
    Stop?: ClaudeHookEntry[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function quote(value: string): string {
  return `"${value}"`;
}

export function getStateFilePath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.claude', 'hit-the-agent-state.json');
}

// 세션마다 progress/<sessionId>.json이 쌓이던 것을 워크스페이스당 파일 1개로 통합.
// 내부적으로는 { [sessionId]: {...} } 형태라 세션별 오프셋/누적치 구분은 그대로 유지된다.
export function getProgressFilePath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.claude', 'hit-the-agent-progress.json');
}

function getSettingsPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.claude', 'settings.local.json');
}

// 파싱 실패 시 undefined를 반환해 호출부가 사용자 파일을 덮어쓰지 않도록 한다.
function readSettings(settingsPath: string): ClaudeSettings | undefined {
  if (!fs.existsSync(settingsPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return undefined;
  }
}

function writeSettings(settingsPath: string, settings: ClaudeSettings): void {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

function isOurEntry(entry: ClaudeHookEntry): boolean {
  return entry.hooks?.some((h) => h.command.includes(HOOK_SCRIPT_NAME)) ?? false;
}

function buildHookCommand(extensionPath: string, workspaceRoot: string, threshold: number): string {
  const scriptPath = path.join(extensionPath, 'scripts', HOOK_SCRIPT_NAME);
  const stateFilePath = getStateFilePath(workspaceRoot);
  const progressFilePath = getProgressFilePath(workspaceRoot);
  return `node ${quote(scriptPath)} --threshold=${threshold} --chance=${TRIGGER_CHANCE} --stateFile=${quote(stateFilePath)} --progressFile=${quote(progressFilePath)}`;
}

// 설정값(on/off, threshold)과 .claude/settings.local.json의 실제 훅 등록 상태를 맞춘다.
// activate 시점과 설정 변경 시점 양쪽에서 호출된다 — 멱등이라 여러 번 불러도 안전하다.
// Stop은 매 턴 종료마다 발동하는 훅이라 SessionEnd와 달리 실시간에 가깝게 반응할 수 있다 (docs/ARCHITECTURE.md 참고).
export function syncTokenWatchHook(context: vscode.ExtensionContext, workspaceRoot: string): void {
  const config = vscode.workspace.getConfiguration('hitTheAgent');
  const enabled = config.get<boolean>('enableTokenWatchHook', false);
  const threshold = config.get<number>('tokenThreshold', 50000);

  const settingsPath = getSettingsPath(workspaceRoot);
  const settings = readSettings(settingsPath);
  if (settings === undefined) {
    vscode.window.showWarningMessage(
      'Hit the Agent: .claude/settings.local.json 파싱에 실패해 Stop 훅을 등록/해제하지 못했습니다. 파일 형식을 확인해주세요.',
    );
    return;
  }

  const before = JSON.stringify(settings);
  const remaining = (settings.hooks?.Stop ?? []).filter((entry) => !isOurEntry(entry));

  if (enabled) {
    remaining.push({
      hooks: [{ type: 'command', command: buildHookCommand(context.extensionPath, workspaceRoot, threshold) }],
    });
  }

  if (remaining.length > 0) {
    settings.hooks = { ...settings.hooks, Stop: remaining };
  } else if (settings.hooks) {
    delete settings.hooks.Stop;
    if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  }

  if (JSON.stringify(settings) === before) return; // 실질적인 변경이 없으면 파일을 건드리지 않는다
  writeSettings(settingsPath, settings);
}
