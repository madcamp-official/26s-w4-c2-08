'use strict';

// Claude Code Stop 훅에서 매 턴 종료마다 실행되는 독립 스크립트. VSCode API 접근 불가 — 순수 Node.
// extension/src/hookManager.ts가 .claude/settings.local.json에 커맨드를 등록할 때
// --threshold / --chance / --stateFile 값을 그 시점의 설정값으로 박아 넣는다.
//
// 절대 규칙: Stop 훅은 exit code 2나 stdout에 {"decision":"block"}을 내보내면 세션을 못 끝나게 막을 수 있다.
// 이 스크립트는 순수 관찰자로만 동작해야 하므로 항상 exit 0, stdout에 아무것도 안 찍는다 — 예외가 나도 마찬가지.

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (const raw of argv.slice(2)) {
    const match = /^--([^=]+)=(.*)$/.exec(raw);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
}

// 트랜스크립트에서 이전에 읽은 지점(offset, 바이트 단위) 이후로 새로 추가된 부분만 읽어
// 매 턴마다 파일 전체를 다시 읽지 않도록 한다 (세션이 길어질수록 전체 재읽기는 비용이 커짐).
// 마지막 줄이 아직 개행으로 안 끝났으면(쓰는 도중) 그 줄은 다음 턴으로 미룬다.
function readNewTokensSince(transcriptPath, offset) {
  let fd;
  try {
    fd = fs.openSync(transcriptPath, 'r');
  } catch {
    return { tokens: 0, newOffset: offset };
  }

  try {
    const size = fs.fstatSync(fd).size;
    if (size <= offset) return { tokens: 0, newOffset: offset };

    const length = size - offset;
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, offset);
    const chunk = buffer.toString('utf8');

    const lastNewline = chunk.lastIndexOf('\n');
    if (lastNewline === -1) return { tokens: 0, newOffset: offset }; // 완결된 줄이 아직 없음

    const complete = chunk.slice(0, lastNewline + 1);
    const consumedBytes = Buffer.byteLength(complete, 'utf8');

    let tokens = 0;
    for (const line of complete.split('\n')) {
      if (!line.trim()) continue;
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      const usage = entry && entry.type === 'assistant' ? entry.message && entry.message.usage : null;
      if (!usage) continue;
      tokens += (usage.input_tokens || 0) + (usage.output_tokens || 0);
    }

    return { tokens, newOffset: offset + consumedBytes };
  } finally {
    fs.closeSync(fd);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const stateFile = args.stateFile;
  const progressFile = args.progressFile;
  if (!stateFile || !progressFile) return;

  const threshold = Number(args.threshold) || 0;
  const chance = args.chance !== undefined ? Number(args.chance) : 0.3;

  let payload;
  try {
    payload = JSON.parse(readStdin());
  } catch {
    return;
  }

  // 이 훅 자신의 이전 block 판단으로 인한 재진입 루프 방지 — 우리는 절대 block하지 않지만 방어적으로 체크.
  if (payload.stop_hook_active) return;
  if (!payload.transcript_path || !payload.session_id) return;

  // 워크스페이스당 파일 1개에 세션별로 묶어서 저장 — 세션마다 파일이 쌓이는 걸 막으면서도
  // 오프셋/누적치는 session_id로 구분되므로 채팅(세션)별 토큰 집계는 그대로 정확하다.
  const allProgress = readJson(progressFile, {});
  // notifiedAtTokenTotal: 마지막으로 발동했을 때의 누적 토큰 수(초기 0). 매번 한 번 뜨고 끝나는 게 아니라,
  // 그 이후로 threshold만큼 토큰을 "새로" 더 쓸 때마다 다시 발동 대상이 되도록 하는 기준점이다.
  const progress = allProgress[payload.session_id] || { offset: 0, tokenTotal: 0, notifiedAtTokenTotal: 0 };

  const { tokens, newOffset } = readNewTokensSince(payload.transcript_path, progress.offset);
  progress.tokenTotal += tokens;
  progress.offset = newOffset;

  if (progress.tokenTotal - progress.notifiedAtTokenTotal >= threshold) {
    if (Math.random() < chance) {
      progress.notifiedAtTokenTotal = progress.tokenTotal;
      try {
        fs.mkdirSync(path.dirname(stateFile), { recursive: true });
        fs.writeFileSync(
          stateFile,
          JSON.stringify({ triggered: true, tokenCount: progress.tokenTotal, timestamp: Date.now() }),
          'utf8',
        );
      } catch {
        // 상태 파일 기록 실패는 게임 쪽 이벤트가 한 번 안 뜨는 정도라 조용히 무시한다
      }
    }
    // 확률에서 떨어졌으면 notifiedAtTokenTotal을 안 옮겨서 다음 턴에도 계속 재도전 대상으로 남는다
  }

  allProgress[payload.session_id] = progress;
  writeJson(progressFile, allProgress);
}

try {
  main();
} catch {
  // 어떤 예외가 나도 사용자의 실제 코딩 세션에 영향을 주면 안 되므로 조용히 삼킨다
}
