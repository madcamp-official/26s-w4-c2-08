# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

VSCode 확장 안에서 실행되는 보스 클리커 게임 **Hit the Agent**. git repo 단위로 그룹 인식해 팀 랭킹 서버 기록. repo 없으면 로컬 전용 모드.

## 프로젝트 목표

- 개인 플레이 가능
- Git Repository 단위로 팀 랭킹 공유
- git remote가 없으면 Local Mode
- git remote가 있으면 Online Mode
- 서버 장애가 발생해도 게임은 정상 동작해야 함

상세 문서: [ARCHITECTURE.md](./docs/ARCHITECTURE.md), [API.md](./docs/API.md), [FRONTEND.md](./docs/FRONTEND.md), [PLAN.md](./docs/PLAN.md)

**현재 상태**: `server/`(백엔드) 로직 완성, 상세는 [server/CLAUDE.md](./server/CLAUDE.md) 참고. `frontend/`(Phaser 게임)와 `extension/`(VSCode 확장) 모두 완성 단계 — extension ↔ webview 메시지 연동(init/agentTaunt/saveLocalScore/saveUserName), git 기반 mode 판별, 온라인 점수 제출·리더보드 조회, 유저네임 모달, 사운드까지 전부 붙어 있다. 무기 시스템은 최초 설계(필드에 놓고 드래그로 충돌)에서 사이드 패널 선택 + 필드를 누르고 있는 동안 사용하는 방식으로 바뀌었고, 30여 종 무기(총기/투척/부메랑/폭탄/설치형/근접/말랑이/손)와 보스 쪽 특수 메커닉(유휴 상태, 방패, 3종 넉백, 빙결/텔레포트 CC, 구토·파이어브레스 반응)까지 확장됐다. 상세는 [FRONTEND.md](./docs/FRONTEND.md) 참고.

## 커맨드

**서버**: [server/CLAUDE.md](./server/CLAUDE.md) 참고 (지금 실행 가능)

**게임/확장** (PLAN.md 예정, 아직 코드 없음)
- 게임 번들링: `vite build` → `bundle.js` 생성 후 webview 로드
- 확장 실행/디버그: VSCode에서 `F5`
- 확장 패키징: `vsce package` → `.vsix` 생성
- 패키지 설치 테스트: `code --install-extension <파일>.vsix`
- 서버 상태 확인 (KCLOUD VM): `systemctl status`

## 스택

- 게임: Phaser, `vite build`로 `bundle.js` 번들링 후 webview 로드
- 확장: VSCode Extension API (`createWebviewPanel`, git 정보 조회)
- 서버: Express + better-sqlite3 (WAL), KCLOUD VM에 systemd 상시구동

## 절대 깨면 안 되는 불변 조건

- **groupId 해싱**: `sha256(repoUrl).slice(0, 12)`. extension.ts에서만 계산, 서버는 받은 값 그대로 저장/조회 — 재계산 금지. 클라이언트/서버 양쪽 알고리즘 반드시 동일해야 함.
- **mode 판별은 extension이 함**: git remote 유무로 `local`/`online` 결정 후 `{ type: 'init', mode, groupId, userName, hasUserName, bestScore }`로 webview에 1회 전달. webview는 이 값을 그대로 신뢰하고 자체 판별하지 않음.
- **webview 리소스는 `asWebviewUri()` 경유**: webview는 `vscode-webview://` 스킴만 신뢰. CSP는 `default-src 'none'` 기준이라 `connect-src`에 VM 주소 명시 안 하면 online 모드 fetch가 조용히 실패함 (에러 안 뜨고 그냥 안 됨 — 네트워크 탭에서 CSP 위반부터 확인).
- **서버 요청 실패해도 게임은 안 죽어야 함**: online 모드 `submitScore`/`fetchLeaderboard`는 try/catch로 감싸고 실패 시 로컬 표시로 폴백.
- **Stop 훅은 기본 off, 마커 기반 merge/제거만**: `hitTheAgent.enableTokenWatchHook` 설정으로 켜면 `extension/src/hookManager.ts`가 워크스페이스의 `.claude/settings.local.json`(로컬 전용, gitignore 대상)에 Stop 훅 1개를 등록. 항목 식별은 커맨드 문자열에 `token-watch-hook.js` 포함 여부로 하므로, 등록/해제 시 그 마커로 걸러낸 항목만 건드리고 사용자가 넣어둔 다른 훅은 절대 손대면 안 됨. 파일 파싱 실패 시 덮어쓰지 않고 경고만.
- **Stop 훅은 절대 block하면 안 됨**: `extension/scripts/token-watch-hook.js`는 exit code 2나 `{"decision":"block"}`을 내보내면 사용자의 실제 코딩 세션 턴이 안 끝나게 막아버림. 항상 exit 0, stdout에 아무것도 안 찍고, 예외도 전부 최상위 try/catch로 삼켜서 사용자 세션에 영향이 절대 없도록 함. `stop_hook_active`가 true면 즉시 종료(재진입 루프 방지).

## 메시지 프로토콜 (extension ↔ webview)

`type` 필드 하나로 분기하는 단일 리스너 구조. 새 메시지 타입 추가할 때도 이 구조 유지.

| 방향 | type | payload |
|---|---|---|
| ext → webview | `init` | `{ mode, groupId, userName, hasUserName, bestScore }` |
| ext → webview | `agentTaunt` | `{ tokenCount }` |
| webview → ext | `saveLocalScore` | `{ score }` |
| webview → ext | `saveUserName` | `{ userName }` |

- **online + username 분기**: `hasUserName`은 extension이 globalState 저장값이나 git `user.name`으로 실제 이름을 알아냈는지를 나타낸다(폴백으로 `'player'`를 쓴 경우 `false`). webview는 `mode === 'online'`이고 `hasUserName === false`일 때만 게임 나가기 시 이름 입력 모달(VSCode 팝업이 아니라 게임 화면 안 DOM 오버레이, `frontend/src/ui/usernameModal.js`)을 띄운다. 이미 이름을 아는 경우(`hasUserName === true`)에는 모달 없이 바로 `submitScore`. 모달에서 확정된 이름은 `saveUserName`으로 `globalState('userName')`에 저장되어, 다음 판부터는 `hasUserName`이 `true`가 되어 다시 뜨지 않는다. local 모드에서는 서버 제출 자체가 없으므로 이 모달은 절대 뜨지 않고 `saveLocalScore`로 바로 로컬 저장.

## 작업 시 참고

- 일정은 [PLAN.md](./docs/PLAN.md) 6일차 기준. 코드 작성 전 해당 일차 체크포인트부터 확인.
- API 변경 시 `docs/API.md` 스키마/엔드포인트 스펙도 같이 갱신.
