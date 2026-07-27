# Hit the Agent
몰입캠프 26s-w4-c2-08 프로젝트 repository

VSCode 확장 안에서 실행되는 보스 클리커 게임. git repo 단위로 그룹을 인식해 팀 랭킹을 서버에 기록하고, repo가 없는 환경에서는 로컬 전용 모드로 동작한다.

- **게임**: Phaser (webview로 이식)
- **확장**: VSCode Extension API (webview 관리, git 정보 조회)
- **서버**: Express + better-sqlite3, KCLOUD VM에 systemd로 배포

## 문서

- [개발 일정 (6일)](./docs/PLAN.md)
- [아키텍처](./docs/ARCHITECTURE.md)
- [프론트엔드 (Phaser) 구현](./docs/FRONTEND.md)
- [API 스펙](./docs/API.md)
