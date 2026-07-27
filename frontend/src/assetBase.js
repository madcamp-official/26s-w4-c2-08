// extension이 webview HTML의 <body data-asset-base>에 심어주는, dist 폴더를 가리키는
// webview-safe(vscode-webview://) base URI. webview는 이 스킴만 신뢰하므로(CLAUDE.md 불변 조건)
// 이미지/오디오 같은 정적 에셋은 전부 이 base 뒤에 상대경로를 붙여서 불러와야 한다.
// vite dev server(순수 브라우저)에서 독립 실행할 때는 이 attribute가 없으므로 빈 문자열로 폴백해
// 그냥 '/audio/...' 같은 상대경로가 되게 한다.
const ASSET_BASE = document.body?.dataset.assetBase || '';

export function assetUrl(relativePath) {
  return `${ASSET_BASE}/${relativePath}`;
}
