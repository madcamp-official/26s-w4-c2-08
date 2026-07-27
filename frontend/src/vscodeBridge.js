// webview 안에서만 존재하는 API. vite dev server(순수 브라우저)에서 개발할 때는 없으므로 안전하게 no-op 처리한다.
const vscodeApi = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;

// extension이 init을 보내주기 전까지의 기본값 — dev server에서 독립 실행할 때도 로컬 모드로 죽지 않고 뜨도록.
export const gameContext = { mode: 'local', groupId: null, userName: 'player', bestScore: 0 };

const initListeners = [];
const agentTauntListeners = [];

export function onInit(callback) {
  initListeners.push(callback);
}

export function onAgentTaunt(callback) {
  agentTauntListeners.push(callback);
}

export function postToExtension(message) {
  vscodeApi?.postMessage(message);
}

// extension ↔ webview는 단일 리스너에서 type으로만 분기한다 (CLAUDE.md 메시지 프로토콜 표 참고)
window.addEventListener('message', (event) => {
  const msg = event.data;
  switch (msg.type) {
    case 'init':
      Object.assign(gameContext, {
        mode: msg.mode,
        groupId: msg.groupId,
        userName: msg.userName,
        bestScore: msg.bestScore ?? 0,
      });
      initListeners.forEach((cb) => cb(gameContext));
      break;
    case 'agentTaunt':
      agentTauntListeners.forEach((cb) => cb(msg.tokenCount));
      break;
    default:
      break;
  }
});
