# Hit the Agent

## 팀원

| 이름 | 학교 | GitHub |
|---|---|---|
|박소요|SMWU|oyossss|
|최재윤|KAIST|Jaeyun-18|

---

## 기획안

- **산출물 주제:** VSCode 확장 안에서 실행되는 보스 클리커 게임 `Hit the Agent`. 코딩하다 지칠 때 잠깐 열어서 스트레스를 풀고, git repo(팀 프로젝트) 단위로 그룹을 인식해 팀원끼리 점수를 겨루는 랭킹을 서버에 기록한다.
- **문제의식:** 개인 최고점만 남기는 캐주얼 게임은 반복 동기가 약하다. `Hit the Agent`는 "같은 repo를 clone한 사람들"을 자동으로 하나의 그룹으로 묶어, 별도의 로그인이나 방 생성 없이도 팀 내 랭킹 경쟁이 바로 성립하게 한다.
- **핵심 원칙:**
  - 서버 장애가 발생해도 게임 자체는 절대 죽지 않아야 한다 (온라인 기능은 항상 로컬 fallback을 가진다).
  - git remote 유무만으로 local/online 모드를 자동 판별하며, 사용자가 별도로 설정할 필요가 없다.
  - webview(게임)는 VSCode API에 직접 접근할 수 없으므로, git 정보 조회·로컬 저장은 항상 extension이 담당하고 postMessage로만 전달한다.
- **자세한 설계 문서:** [ARCHITECTURE.md](./docs/ARCHITECTURE.md)(전체 구조·모드 분기), [API.md](./docs/API.md)(서버 스펙), [FRONTEND.md](./docs/FRONTEND.md)(Phaser 게임 구현), [PLAN.md](./docs/PLAN.md)(6일 개발 일정, 현재는 역사적 기록)

---

## 기능 명세서

### 모드 판별 (local / online)

`extension.ts`가 워크스페이스의 git remote 유무로 1회 판별해 webview에 전달하며, webview는 이 값을 그대로 신뢰하고 자체 판별하지 않는다.

| 모드 | 조건 | 동작 |
|---|---|---|
| `local` | git remote 없음 | 서버 통신 코드 경로를 타지 않음. 최고 점수는 `context.globalState`에 저장/조회 |
| `online` | git remote 있음 | `groupId = sha256(repoUrl).slice(0, 12)`, `userName = git config user.name`. 점수 제출/리더보드 조회를 webview → 서버로 직접 HTTP 요청 |

online 모드에서 서버 요청이 실패해도 게임은 죽지 않고 로컬 표시로 fallback한다.

### 무기 시스템

최초 설계(필드에 놓고 드래그로 충돌)에서, 사이드 패널에서 무기를 고르고 필드를 누르고 있는 동안 사용하는 방식으로 바뀌었다. 30여 종의 무기를 아래 카테고리로 구현했다. 자세한 종류별 판정 방식은 [FRONTEND.md](./docs/FRONTEND.md#무기-시스템)에 정리되어 있다.

| 카테고리 | 예시 |
|---|---|
| 총기 | `pistol`, `machine_gun`, `shotgun`, `sniper`, `revolver` |
| 투척 | `ball`, `dart`, `megaphone`, `tomato`, `watermelon`, `water_balloon`, `beach_ball` |
| 부메랑 | `boomerang` |
| 폭탄 | `grenade`, `dynamite`(연쇄 폭발) |
| 설치형 | `washing_machine` |
| 근접 | `bat`, `wand`(텔레포트), `whip`, `bamboo_cane`, `frying_pan`, `slipper`, `boxing_glove`, `debugger`(고정) |
| 말랑이 | `squishy`, `rubber_duck`, `teddy_bear`, `cheese_squishy` |
| 손 | `hand`(힐링), `bad_hand`, `lips`(구토 트리거), `taser`, `keyboard` |

### 보스 메커닉

기본 HP바/피격 반응 외에 아래 특수 메커닉이 추가됐다.

- 유휴(idle) 상태
- 방패
- 3종 넉백
- 빙결/텔레포트 CC(군중 제어)
- 구토·파이어브레스 반응

### 메시지 프로토콜 (extension ↔ webview)

`type` 필드 하나로 분기하는 단일 리스너 구조.

| 방향 | type | payload |
|---|---|---|
| ext → webview | `init` | `{ mode, groupId, userName, hasUserName, bestScore }` |
| ext → webview | `agentTaunt` | `{ tokenCount }` |
| webview → ext | `saveLocalScore` | `{ score }` |
| webview → ext | `saveUserName` | `{ userName }` |

`hasUserName`이 `false`(온라인 모드 + 실제 이름을 알아내지 못함)일 때만 게임 나가기 시 이름 입력 모달(게임 화면 안 DOM 오버레이)을 띄운다. local 모드에서는 이 모달이 절대 뜨지 않는다.

### 서버 API

Express + `better-sqlite3`(WAL 모드), KCLOUD VM에 systemd로 상시 구동. 전체 스펙은 [API.md](./docs/API.md) 참고.

| 메서드/경로 | 설명 |
|---|---|
| `POST /api/scores` | `{ groupId, userName, score }` 점수 1건 저장 |
| `GET /api/leaderboard?groupId=...` | groupId 기준 유저별 최고점수 상위 20명, 내림차순 |

### 화면 크기 대응

웹뷰 패널 크기가 바뀌어도 스크롤 없이 Phaser `Scale.FIT`으로 800×600 비율을 유지한 채 캔버스가 확대/축소된다(게임 좌표계 자체는 그대로 800×600 기준). 자세한 내용은 [FRONTEND.md](./docs/FRONTEND.md#화면-크기-대응) 참고.

### Stop 훅 — 토큰 사용량 기반 실시간 캐릭터 대사 (선택 기능, 기본 off)

`hitTheAgent.enableTokenWatchHook` 설정을 켜면, Claude Code가 매 턴 응답을 마칠 때마다 세션 누적 토큰 사용량이 임계치(`hitTheAgent.tokenThreshold`)를 넘길 때 확률적으로 게임 캐릭터가 대사를 띄운다. 워크스페이스의 `.claude/settings.local.json`(로컬 전용)에 마커 기반으로 Stop 훅을 등록/해제하며, 항상 exit 0으로 종료해 사용자의 실제 코딩 세션을 절대 막지 않는다. 자세한 동작은 [ARCHITECTURE.md](./docs/ARCHITECTURE.md#stop-훅-토큰-사용량-기반-실시간-캐릭터-대사) 참고.

---

## 실행 방법

### 준비물

- Node.js
- VSCode

### 서버

```bash
cd server
npm install
node index.js          # localhost:3000, PORT env로 변경 가능
```

```bash
curl -X POST localhost:3000/api/scores -H "Content-Type: application/json" -d '{"groupId":"test","userName":"me","score":100}'
curl "localhost:3000/api/leaderboard?groupId=test"
```

### 게임 (프론트엔드)

```bash
cd frontend
npm install
npm run build           # vite build → bundle.js 생성
```

### 확장

```bash
cd extension
npm install
npm run compile         # tsc
```

- 실행/디버그: VSCode에서 확장 폴더를 열고 `F5`
- 패키징: `vsce package` → `.vsix` 생성
- 설치 테스트: `code --install-extension <파일>.vsix`

### 서버 상태 확인 (KCLOUD VM)

```bash
systemctl status
```

---

## 기술 스택

| 분류 | 사용 기술 |
|---|---|
| 게임 | Phaser, `vite build`로 `bundle.js` 번들링 후 webview 로드 |
| 확장 | VSCode Extension API (`createWebviewPanel`, git 정보 조회) |
| 서버 | Express + better-sqlite3 (WAL 모드), KCLOUD VM에 systemd 상시구동 |

---

## 데이터 구조

### DB 스키마 (`scores` 테이블)

```sql
CREATE TABLE scores (
  id INTEGER PRIMARY KEY,
  group_id TEXT,
  user_name TEXT,
  score INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### groupId 해싱

extension.ts에서만 계산하며, 서버는 받은 값을 그대로 저장/조회할 뿐 재계산하지 않는다. 클라이언트/서버 양쪽 알고리즘이 반드시 동일해야 하는 불변 조건이다.

```
groupId = sha256(repoUrl).slice(0, 12)
```

### 파일 맵

| 경로 | 역할 |
|---|---|
| `extension/src/extension.ts` | webview 생성, git 정보 조회·mode 판별, `postMessage` 송수신 |
| `extension/src/hookManager.ts` | Stop 훅 등록/해제 (`.claude/settings.local.json`) |
| `extension/scripts/token-watch-hook.js` | Claude Code Stop 이벤트에서 실행되는 독립 Node 스크립트 |
| `frontend/src` | Phaser 게임 소스 (`BootScene`/`GameScene`, 무기·보스 시스템, HUD, 유저네임 모달) |
| `server/index.js` | express 세팅, cors/json 미들웨어, `/health`, 라우터 마운트 |
| `server/db.js` | better-sqlite3 연결, `scores` 테이블 스키마, WAL 모드 |
| `server/routes/scores.js` | `POST /api/scores` |
| `server/routes/leaderboard.js` | `GET /api/leaderboard` |
