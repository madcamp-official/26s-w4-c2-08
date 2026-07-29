# 개발 일정 (6일)

VSCode 확장 안에서 동작하는 보스 클리커 게임 **Hit the Agent** + 그룹 랭킹 서버. 전체 아키텍처는 [ARCHITECTURE.md](./ARCHITECTURE.md), API 스펙은 [API.md](./API.md) 참고.

> **실제 구현은 이 계획보다 훨씬 확장됐다.** 무기는 여기 적힌 3종(설치형/투척형/휴대형) 대신 사이드 패널에서 고르는 30여 종(총기/투척/부메랑/폭탄/설치형/근접/말랑이/손)으로, 조작 방식도 드래그 충돌이 아니라 필드를 누르고 있는 방식으로 바뀌었다. 보스 쪽에도 계획에 없던 유휴 상태·방패·3종 넉백·CC·구토/파이어브레스 반응이 추가됐다. 아래 일정은 초기 설계 의도와 진행 순서를 보여주는 역사적 기록으로 남겨두고, **현재 실제 동작은 [FRONTEND.md](./FRONTEND.md)를 기준으로 삼는다.**

---

## 1일차 — 게임 코어 + 백엔드 뼈대

**게임 (Phaser)**
- `BootScene`(에셋 로드), `GameScene`(메인 로직) 구성
- 보스/무기 스프라이트 배치, HP바 구현
- 보스 드래그 이동(포인터로 잡아서 옮기기) → 무기와 충돌 시 랜덤 데미지 계산 → HP 감소 → HP바 갱신 → 점수 증가 ([상세](./FRONTEND.md#전투-시스템))
- HP 0 → 즉시 보스 리스폰 (승리 오버레이 없이 계속 진행, [상세](./FRONTEND.md#점수--보스-리스폰))

**백엔드**
- Express + `better-sqlite3` 프로젝트 초기화
- `scores` 테이블 생성 (스키마: [API.md](./API.md#db-스키마))
- `POST /api/scores`, `GET /api/leaderboard` 라우트 뼈대만 작성 (더미 응답)

**체크포인트**
- [x] 브라우저에서 게임 클릭 → 사망 사이클 동작
- [x] `curl`로 두 API 모두 200 응답 확인

---

## 2일차 — 재미 요소 + API 로직 완성

**게임**
- 무기 종류 3가지 구현: 설치형 / 투척형 / 휴대형 ([상세](./FRONTEND.md#무기-시스템-설치형--투척형--휴대형))
- 타격 이펙트 (흔들림 tween, 데미지 텍스트 팝업)
- 사운드 (타격음/보스 처치음)
- 종료 버튼 UI 추가 (보스가 즉시 리스폰되므로 HP 0이 아니라 수동 종료 시점에 점수 제출)

> 콤보 시스템/크리티컬 히트는 구현하지 않기로 결정 ([FRONTEND.md 구현 현황](./FRONTEND.md#구현-현황) 참고).

**백엔드**
- `POST /api/scores`: 점수 insert 로직 완성
- `GET /api/leaderboard`: groupId 기준 유저별 최고점수 정렬 반환 ([쿼리](./API.md#get-apileaderboard))
- groupId 해싱 함수 작성 (repo URL → sha256 → 앞 12자리, [상세](./API.md#groupid-해싱))
- Postman/curl로 여러 유저 데이터 넣고 정렬 확인

**체크포인트**
- [x] 사운드까지 붙은 게임 완성
- [x] 여러 점수 넣었을 때 랭킹 정렬 정상 확인

---

## 3일차 — Webview 이식 + VM 배포

**게임 → 확장**
- `vite build`로 Phaser 게임을 `bundle.js`로 번들링
- `extension.ts`에서 `createWebviewPanel()` 생성
- 리소스 경로를 `asWebviewUri()`로 치환
- 기본 CSP 메타 태그 설정 (`connect-src`는 4일차에 채움)
- `package.json`에 실행 커맨드 등록, `F5`로 확인

**서버 배포**
- KCLOUD VM에 서버 코드 이전 (`git clone` or `scp`)
- `systemd` 서비스 등록으로 상시 구동
- 방화벽/포트 개방 확인, 외부에서 `curl`로 접근 테스트

**체크포인트**
- [x] `Ctrl+Shift+P` 커맨드로 VSCode 안에 게임 뜸

---

## 4일차 — git 정보 연동 + local/online 분기

**extension.ts에서 git 정보 추출 & 모드 판별**
- `git config --get remote.origin.url` / `user.name`으로 repo URL, 유저명 조회
- repo URL 없음 → `mode: 'local'`
- repo URL 있음 → `mode: 'online'` + groupId 계산
- 결과를 `panel.webview.postMessage({ type: 'init', mode, groupId, userName })`로 전달
- `mode: 'local'`이면 webview 쪽에서 서버 통신 코드 경로 자체를 안 타도록 분기

**webview(game.js) 메시지 핸들러**
- `init`(모드 전달) 메시지 타입을 `message` 리스너에서 `type` 분기로 처리
- 종료 버튼 클릭 시 `onGameEnd`: online이면 점수 제출 + 리더보드 조회, local이면 extension에 `saveLocalScore` 메시지 전송 → extension이 `globalState.update('bestScore', ...)` 처리

**CSP / CORS**
- CSP `connect-src`에 VM 주소 추가
- 서버 `cors({ origin: '*' })` 허용

**체크포인트**
- [x] git remote 있는 repo에서 실행 → 서버로 점수 전송 확인
- [x] git remote 없는 폴더에서 실행 → Network 탭에서 서버 요청이 아예 안 나가는지 확인

---

## 5일차 — 리더보드 UI + 안정성

**게임**
- `mode === 'online'`: 종료 버튼 클릭 후 `GET /api/leaderboard?groupId=xxx` 호출 → 랭킹 리스트 렌더링
- `mode === 'local'`: 랭킹 섹션 숨기고 "내 최고 기록: XXX점" 표시 (`globalState`에서 조회)
- 로딩/에러 상태 UI 처리

**서버 안정성**
- SQLite WAL 모드 설정 (`db.pragma('journal_mode = WAL')`)
- online 모드에서도 서버 연결 실패 시 fallback 처리 (콘솔 경고 + 로컬 표시로 전환, 크래시 방지)
- 서버 강제 종료 후에도 게임 자체는 안 죽는지 테스트

**체크포인트**
- [x] online/local 두 모드 모두 화면 정상 표시
- [x] 서버 꺼도 게임은 정상 진행

---

## 6일차 — 패키징 + 최종 점검

- `vsce package`로 `.vsix` 생성
- 새 프로필/다른 PC에서 설치 테스트 (`code --install-extension`)
- 실제 시나리오 리허설
  - 팀 repo 클론 → 확장 설치 → 게임 실행 → groupId 자동 인식 → 점수 반영 → 팀원 PC에서 같은 랭킹 확인
  - repo 없는 빈 폴더에서 실행 → 로컬 전용 모드로 정상 동작 확인
- VM 서버 상태 최종 점검 (`systemctl status`), 재시작 명령어 확인
- README 정리, 발표 자료 준비

**체크포인트**
- [x] `.vsix` 설치 → 실행까지 새 환경에서 재현 (`extension/hit-the-agent-0.0.1.vsix` 빌드 완료)
- [x] online/local 시나리오 모두 리허설 통과
