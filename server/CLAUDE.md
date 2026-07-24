# CLAUDE.md (server/)

이 서버는 Express + better-sqlite3 기반 팀 랭킹 API. 전체 프로젝트 맥락(확장/webview와의 관계)은 루트 [CLAUDE.md](../CLAUDE.md), API 스펙은 [../docs/API.md](../docs/API.md) 참고.

**현재 상태**: 1일차 뼈대만 존재. 라우트는 더미 응답(`{ ok: true }`, `{ leaderboard: [] }`), 실제 insert/쿼리 로직은 2일차.

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

- `index.js` — express 세팅, cors/json 미들웨어, 라우터 마운트(`/api`), listen
- `db.js` — better-sqlite3 연결, `scores` 테이블 스키마, WAL 모드. `DB_PATH` env로 경로 변경
- `routes/scores.js` — `POST /api/scores` (더미, insert 로직은 2일차)
- `routes/leaderboard.js` — `GET /api/leaderboard` (더미, 쿼리 로직은 2일차)

## 지켜야 할 것 (../docs/API.md, ../docs/ARCHITECTURE.md 근거)

- **groupId는 서버가 재계산하지 않음** — extension.ts가 계산해서 보낸 값을 그대로 저장/조회만. 서버 코드에 해싱 로직 넣지 말 것.
- **CORS `origin: '*'` 유지** — webview(`vscode-webview://`)가 다른 origin이라 없으면 fetch 응답을 브라우저가 막음.
- **WAL 모드 유지** (`db.pragma('journal_mode = WAL')`) — 리더보드 조회(읽기)와 점수 제출(쓰기)이 서로 안 막게.
- 2일차부터: `POST /api/scores`는 실제 insert, `GET /api/leaderboard`는 `docs/API.md`에 명시된 쿼리(`GROUP BY user_name ORDER BY score DESC LIMIT 20`) 그대로 구현.
