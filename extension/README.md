# Hit the Agent

VSCode 안에서 실행되는 보스 클리커 게임. 바이브 코딩 중 비는 시간에 잠깐 열어서 스트레스를 풀고, 같은 git repository를 쓰는 팀원끼리 자동으로 그룹이 묶여 랭킹을 겨룰 수 있습니다.

## 시작하기

커맨드 팔레트(`Ctrl+Shift+P` / `Cmd+Shift+P`)에서 `Hit the Agent: 게임 시작`을 실행하세요.

## 모드

- **Local 모드** — git remote가 없는 폴더에서 실행하면 개인 최고 점수만 기기에 저장됩니다.
- **Online 모드** — git remote가 있는 repository에서 실행하면 같은 repository를 사용하는 팀원들과 자동으로 그룹이 매칭되어 서버에 점수가 기록되고 팀 랭킹을 조회할 수 있습니다. 서버 연결에 실패해도 게임 진행에는 영향이 없으며 로컬 표시로 자연스럽게 대체됩니다.

모드는 별도 설정 없이 git remote 유무만으로 자동 판별됩니다.

## 무기 시스템

사이드 패널에서 무기를 고르고 필드를 누르고 있는 동안 사용하는 방식입니다. 총기·투척·부메랑·폭탄·설치형·근접·말랑이·손 등 30여 종의 무기와, 유휴 상태·방패·넉백·빙결/텔레포트 등 다양한 보스 반응을 제공합니다.

## 설정

| 설정 | 기본값 | 설명 |
|---|---|---|
| `hitTheAgent.enableTokenWatchHook` | `false` | 켜면 Claude Code가 매 턴 응답을 마칠 때마다 누적 토큰 사용량을 확인해 임계치를 넘으면 확률적으로 게임 캐릭터가 실시간으로 말을 겁니다. |
| `hitTheAgent.tokenThreshold` | `1` | 위 옵션이 발동하는 토큰 임계치(세션 내 input+output 합계). |

## 요구사항

- VSCode `1.85.0` 이상

## 크레딧

- 효과음: 대부분 [Pixabay](https://pixabay.com), 일부(`seoyoon.wav`)는 자체 녹음
- 폰트: [Galmuri](https://github.com/quiple/galmuri) (Lee Minseo, SIL Open Font License 1.1)
- 아이콘: [Iconoir](https://iconoir.com) (MIT License)

## 라이선스

MIT — 단, 위 크레딧의 폰트는 자체 라이선스(SIL OFL 1.1)를 따릅니다.
