import { defineConfig } from 'vite';

// extension.ts가 webview HTML에서 고정된 파일명(bundle.js)으로 이 산출물을 직접 참조한다
// (docs/ARCHITECTURE.md 리소스 로딩) — 해시가 붙으면 extension 쪽에서 매번 파일명을 찾아야 해서 고정한다.
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'bundle.js',
        chunkFileNames: 'bundle.js',
        assetFileNames: '[name][extname]',
      },
    },
  },
});
