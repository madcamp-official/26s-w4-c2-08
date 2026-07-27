# API 스펙

Express + `better-sqlite3` (WAL 모드) 기반. KCLOUD VM에 `systemd`로 상시 구동.

## DB 스키마

```sql
CREATE TABLE scores (
  id INTEGER PRIMARY KEY,
  group_id TEXT,
  user_name TEXT,
  score INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```js
db.pragma('journal_mode = WAL');
```

## groupId 해싱

extension.ts에서 계산해 클라이언트가 항상 채워서 보낸다. 서버는 받은 값을 그대로 저장/조회할 뿐 재계산하지 않는다.

```
groupId = sha256(repoUrl).slice(0, 12)
```

- `repoUrl` = `git config --get remote.origin.url`
- git remote가 없는 워크스페이스는 애초에 online 모드로 진입하지 않으므로 groupId가 없다.

## `POST /api/scores`

점수 1건 저장.

**Request**
```json
{
  "groupId": "a1b2c3d4e5f6",
  "userName": "jaeyun",
  "score": 1234
}
```

**Response** `200`
```json
{ "ok": true }
```

## `GET /api/leaderboard`

groupId 기준 유저별 최고점수 상위 20명, 내림차순.

**Query params**: `groupId` (required)

```sql
SELECT user_name, MAX(score) as score FROM scores
WHERE group_id = ? GROUP BY user_name ORDER BY score DESC LIMIT 20
```

**Response** `200`
```json
{
  "leaderboard": [
    { "userName": "jaeyun", "score": 5000 },
    { "userName": "minwoo", "score": 4200 }
  ]
}
```

## CORS

```js
app.use(cors({ origin: '*' }));
```

webview 쪽 CSP `connect-src`에도 VM 주소(`https://vibehit.backend.madcamp-kaist.org`)를 명시해야 요청이 통과한다.

## 클라이언트 측 fallback

online 모드에서 서버 요청이 실패해도 게임이 중단되지 않도록 클라이언트에서 try/catch로 감싸고 로컬 표시로 전환한다:

```js
try {
  await submitScore(...);
} catch (e) {
  console.warn('서버 연결 실패, 로컬 표시로 전환');
}
```
