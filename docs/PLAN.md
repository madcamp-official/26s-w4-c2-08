# 개발 일정 (6일)

VSCode 확장 안에서 동작하는 보스 클리커 게임 + 그룹 랭킹 서버. 전체 아키텍처는 [ARCHITECTURE.md](./ARCHITECTURE.md), API 스펙은 [API.md](./API.md) 참고.

---

## 1일차 — 게임 코어 + 백엔드 뼈대

**게임 (Phaser)**
- `BootScene`(에셋 로드), `GameScene`(메인 로직) 구성
- 보스 스프라이트 배치, HP바 구현
- 클릭 → 랜덤 데미지 계산 → HP 감소 → HP바 갱신
- HP 0 → 승리 오버레이 표시

**백엔드**
- Express + `better-sqlite3` 프로젝트 초기화
- `scores` 테이블 생성 (스키마: [API.md](./API.md#db-스키마))
- `POST /api/scores`, `GET /api/leaderboard` 라우트 뼈대만 작성 (더미 응답)

**체크포인트**
- [ ] 브라우저에서 게임 클릭 → 사망 사이클 동작
- [ ] `curl`로 두 API 모두 200 응답 확인

---

## 2일차 — 재미 요소 + API 로직 완성

**게임**
- 콤보 시스템 (연속 클릭 시간 기반 배율 상승)
- 크리티컬 히트 (확률 기반 데미지 배수)
- 타격 이펙트 (흔들림 tween, 데미지 텍스트 팝업)
- 사운드 (타격음/크리티컬음/승리음)

**백엔드**
- `POST /api/scores`: 점수 insert 로직 완성
- `GET /api/leaderboard`: groupId 기준 유저별 최고점수 정렬 반환 ([쿼리](./API.md#get-apileaderboard))
- groupId 해싱 함수 작성 (repo URL → sha256 → 앞 12자리, [상세](./API.md#groupid-해싱))
- Postman/curl로 여러 유저 데이터 넣고 정렬 확인

**체크포인트**
- [ ] 콤보/사운드까지 붙은 게임 완성
- [ ] 여러 점수 넣었을 때 랭킹 정렬 정상 확인

---

## 3일차 — Webview 이식 + VM 배포 + 포커스 감지 리스너 등록 ⭐

**게임 → 확장**
- `vite build`로 Phaser 게임을 `bundle.js`로 번들링
- `extension.ts`에서 `createWebviewPanel()` 생성
- 리소스 경로를 `asWebviewUri()`로 치환
- 기본 CSP 메타 태그 설정 (`connect-src`는 4일차에 채움)
- `package.json`에 실행 커맨드 등록, `F5`로 확인

**⭐ 포커스/활성 상태 감지 리스너**

Webview 패널 생성 시점에 아래 두 리스너를 함께 등록 (자세한 프로토콜은 [ARCHITECTURE.md](./ARCHITECTURE.md#포커스-감지--pauseresume)):
- `panel.onDidChangeViewState` — 다른 탭으로 전환 시 감지
- `vscode.window.onDidChangeWindowState` — VSCode 창 자체가 포커스를 잃을 때 감지

**서버 배포**
- KCLOUD VM에 서버 코드 이전 (`git clone` or `scp`)
- `systemd` 서비스 등록으로 상시 구동
- 방화벽/포트 개방 확인, 외부에서 `curl`로 접근 테스트

**체크포인트**
- [ ] `Ctrl+Shift+P` 커맨드로 VSCode 안에 게임 뜸
- [ ] VM 재부팅 후에도 서버 자동 기동 확인
- [ ] ⭐ 다른 탭 클릭 시 게임이 멈추는지, VSCode 창 밖으로 포커스 나갔을 때도 멈추는지 확인 (webview 콘솔 메시지 수신 로그로 확인)

---

## 4일차 — git 정보 연동 + local/online 분기 + pause/resume 로직 연동 ⭐

**extension.ts에서 git 정보 추출 & 모드 판별**
- `git config --get remote.origin.url` / `user.name`으로 repo URL, 유저명 조회
- repo URL 없음 → `mode: 'local'`
- repo URL 있음 → `mode: 'online'` + groupId 계산
- 결과를 `panel.webview.postMessage({ type: 'init', mode, groupId, userName })`로 전달
- `mode: 'local'`이면 webview 쪽에서 서버 통신 코드 경로 자체를 안 타도록 분기

**webview(game.js) 메시지 핸들러 통합** ⭐
- `init`(모드 전달), `setPaused`(포커스 상태 전달) 두 메시지 타입을 하나의 `message` 리스너에서 `type` 분기로 처리
- `setPaused: true` → `game.scene.pause()` + `game.input.enabled = false` (입력도 함께 차단)
- 클리어 시 `onGameClear`: online이면 점수 제출 + 리더보드 조회, local이면 extension에 `saveLocalScore` 메시지 전송 → extension이 `globalState.update('bestScore', ...)` 처리

**CSP / CORS**
- CSP `connect-src`에 VM 주소 추가
- 서버 `cors({ origin: '*' })` 허용

**체크포인트**
- [ ] git remote 있는 repo에서 실행 → 서버로 점수 전송 확인
- [ ] git remote 없는 폴더에서 실행 → Network 탭에서 서버 요청이 아예 안 나가는지 확인
- [ ] ⭐ 정지 상태에서 클릭해도 데미지가 안 들어가는지, 정지 중 서버 요청이 잘못 트리거되지 않는지 확인

---

## 5일차 — 리더보드 UI + 일시정지 오버레이 ⭐ + 안정성

**게임**
- `mode === 'online'`: 클리어 후 `GET /api/leaderboard?groupId=xxx` 호출 → 랭킹 리스트 렌더링
- `mode === 'local'`: 랭킹 섹션 숨기고 "내 최고 기록: XXX점" 표시 (`globalState`에서 조회)
- 로딩/에러 상태 UI 처리
- ⭐ 게임 정지 시 "일시정지" 오버레이 표시 (`showPauseOverlay(paused)`, 사용자가 왜 안 눌리는지 헷갈리지 않도록)

**서버 안정성**
- SQLite WAL 모드 설정 (`db.pragma('journal_mode = WAL')`)
- online 모드에서도 서버 연결 실패 시 fallback 처리 (콘솔 경고 + 로컬 표시로 전환, 크래시 방지)
- 서버 강제 종료 후에도 게임 자체는 안 죽는지 테스트

**체크포인트**
- [ ] online/local 두 모드 모두 화면 정상 표시
- [ ] 서버 꺼도 게임은 정상 진행
- [ ] ⭐ 일시정지 오버레이가 포커스 이동에 맞춰 정상적으로 뜨고 사라짐

---

## 6일차 — 패키징 + 최종 점검

- `vsce package`로 `.vsix` 생성
- 새 프로필/다른 PC에서 설치 테스트 (`code --install-extension`)
- 실제 시나리오 리허설
  - 팀 repo 클론 → 확장 설치 → 게임 실행 → groupId 자동 인식 → 점수 반영 → 팀원 PC에서 같은 랭킹 확인
  - repo 없는 빈 폴더에서 실행 → 로컬 전용 모드로 정상 동작 확인
  - ⭐ 다른 탭(예: Copilot Chat) 갔다가 게임 탭 복귀했을 때 정상 재개되는지 확인
- VM 서버 상태 최종 점검 (`systemctl status`), 재시작 명령어 확인
- README 정리, 발표 자료 준비

**체크포인트**
- [ ] `.vsix` 설치 → 실행까지 새 환경에서 재현
- [ ] online/local 시나리오 모두 리허설 통과
- [ ] VM 서버 재부팅 복원력 확인

---

> ⭐ 표시는 포커스 감지 기반 pause/resume 기능. 3일차(리스너 등록)와 4일차(로직 연동)에 자연스럽게 얹히는 구조라 6일 일정 자체는 늘어나지 않음.
