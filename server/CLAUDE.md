# CLAUDE.md (server/)

이 서버는 Express + better-sqlite3 기반 팀 랭킹 API. 전체 프로젝트 맥락(확장/webview와의 관계)은 루트 [CLAUDE.md](../CLAUDE.md), API 스펙은 [../docs/API.md](../docs/API.md) 참고.

**현재 상태**: 완료, 안정 상태 유지 중. 라우트 실제 insert/쿼리 로직 동작(`routes/scores.js`, `routes/leaderboard.js`). groupId 해싱은 `scripts/group-id.js`(테스트 전용, 실제 계산은 extension.ts 몫). 프론트엔드/확장 쪽 기능이 최초 설계보다 크게 확장됐지만(무기 시스템 재설계, 유저네임 모달 등, [FRONTEND.md](../docs/FRONTEND.md) 참고) 이 서버 API 자체는 변경 없이 그대로 쓰이고 있다.

## 커맨드

```bash
npm install
node index.js          # localhost:3000, PORT env로 변경 가능
```
```bash
curl -X POST localhost:3000/api/scores -H "Content-Type: application/json" -d '{"groupId":"test","userName":"me","score":100}'
curl "localhost:3000/api/leaderboard?groupId=test"
```

## 파일 맵

- `index.js` — express 세팅, cors/json 미들웨어, `/health`, 라우터 마운트(`/api`), listen
- `db.js` — better-sqlite3 연결, `scores` 테이블 스키마, WAL 모드. `DB_PATH` env로 경로 변경
- `routes/scores.js` — `POST /api/scores`, prepared statement로 insert
- `routes/leaderboard.js` — `GET /api/leaderboard`, groupId 기준 유저별 최고점 정렬 쿼리
- `scripts/group-id.js` — 테스트용 groupId 생성 (`node scripts/group-id.js <repoUrl>`), 서버 로직에서는 안 씀

## 지켜야 할 것 (../docs/API.md, ../docs/ARCHITECTURE.md 근거)

- **groupId는 서버가 재계산하지 않음** — extension.ts가 계산해서 보낸 값을 그대로 저장/조회만. 서버 코드에 해싱 로직 넣지 말 것.
- **CORS `origin: '*'` 유지** — webview(`vscode-webview://`)가 다른 origin이라 없으면 fetch 응답을 브라우저가 막음.
- **WAL 모드 유지** (`db.pragma('journal_mode = WAL')`) — 리더보드 조회(읽기)와 점수 제출(쓰기)이 서로 안 막게.
- **SQL은 항상 prepared statement로** — `?` placeholder 없이 문자열 이어붙이지 말 것 (SQL Injection).
- 3일차: KCLOUD VM 배포 + systemd 등록 (서버 코드 자체 변경 없음, 배포 작업만).
