// vsix로 패키징하면 extension이 frontend/와 다른 폴더에 설치돼 '../frontend/dist'를 못 찾는다.
// 그래서 패키징 전에 frontend/dist를 extension/media로 복사해 extension 내부에 함께 담는다.
// package.json의 vscode:prepublish에서 vsce package 실행 시 자동으로 호출된다.
import { cpSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const extensionRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(extensionRoot, '..', 'frontend', 'dist');
const dest = path.join(extensionRoot, 'media');

if (!existsSync(src)) {
  console.error(`[copy-webview] frontend/dist가 없습니다. 먼저 frontend에서 'npm run build'를 실행하세요: ${src}`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`[copy-webview] ${src} -> ${dest} 복사 완료`);
