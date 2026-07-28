import { UI_FONT_FAMILY } from '../config/constants.js';

// Hud.js 사이드패널과 같은 톤(PANEL_BG/PANEL_ACCENT)을 그대로 맞춰서, Phaser 캔버스가 아니라
// webview DOM 위에 떠도 "같은 게임 화면 안의 창"처럼 보이게 한다.
const PANEL_BG = '#1e1e1e';
const PANEL_CONTENT_BG = '#242424';
const PANEL_ACCENT = '#99ff33';

let activeOverlay = null;

// 게임 나가기를 누를 때마다(온라인 모드) 리더보드에 제출할 이름을 게임 화면 안에서 직접 입력받는다.
// VSCode 자체 팝업(showInputBox) 대신 webview DOM 오버레이를 써서 게임 화면 밖으로 나가는 느낌이 없게 한다.
// Enter/확인 버튼으로 확정, Esc는 취소하고 현재 이름을 그대로 쓴다 — 어느 쪽이든 게임 흐름은 막지 않는다.
export function showUsernameModal(currentName) {
  activeOverlay?.remove();

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: ${UI_FONT_FAMILY};
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      width: 260px;
      background: ${PANEL_BG};
      border: 2px solid ${PANEL_ACCENT};
      border-radius: 10px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    `;

    const title = document.createElement('div');
    title.textContent = '리더보드 이름';
    title.style.cssText = `
      color: ${PANEL_ACCENT};
      font-size: 14px;
      font-weight: bold;
      letter-spacing: 0.5px;
    `;

    const desc = document.createElement('div');
    desc.textContent = '팀 랭킹에 표시될 이름을 입력하세요';
    desc.style.cssText = `
      color: #cccccc;
      font-size: 11px;
      margin-top: -8px;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.maxLength = 20;
    input.style.cssText = `
      background: ${PANEL_CONTENT_BG};
      border: 1px solid #444444;
      border-radius: 6px;
      padding: 8px 10px;
      color: #ffffff;
      font-size: 14px;
      font-family: inherit;
      outline: none;
    `;
    input.addEventListener('focus', () => { input.style.borderColor = PANEL_ACCENT; });
    input.addEventListener('blur', () => { input.style.borderColor = '#444444'; });

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.textContent = '확인';
    confirmButton.style.cssText = `
      background: ${PANEL_ACCENT};
      color: #000000;
      font-weight: bold;
      font-family: inherit;
      font-size: 14px;
      border: none;
      border-radius: 999px;
      padding: 8px 0;
      cursor: pointer;
    `;

    const close = (userName) => {
      overlay.remove();
      if (activeOverlay === overlay) activeOverlay = null;
      resolve(userName);
    };
    const confirm = () => close(input.value.trim() || currentName);

    confirmButton.addEventListener('pointerdown', confirm);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirm();
      if (e.key === 'Escape') close(currentName);
    });

    panel.append(title, desc, input, confirmButton);
    overlay.append(panel);
    document.body.append(overlay);
    activeOverlay = overlay;

    input.focus();
    input.select();
  });
}
