// extension.ts의 VM_ORIGIN과 반드시 같은 주소를 가리켜야 한다 — 거기서 CSP connect-src에 이 주소를 허용해뒀다.
const VM_ORIGIN = 'https://vibehit.backend.madcamp-kaist.org';

export async function submitScore(groupId, userName, score) {
  const res = await fetch(`${VM_ORIGIN}/api/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, userName, score }),
  });
  if (!res.ok) throw new Error(`submitScore failed: ${res.status}`);
}

export async function fetchLeaderboard(groupId) {
  const res = await fetch(`${VM_ORIGIN}/api/leaderboard?groupId=${encodeURIComponent(groupId)}`);
  if (!res.ok) throw new Error(`fetchLeaderboard failed: ${res.status}`);
  const { leaderboard } = await res.json();
  return leaderboard;
}
