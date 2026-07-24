// 회전된 채 텍스처에 미리 그려진(방망이처럼) 무기의 실제 실루엣에 맞는 정밀 히트 판정을 위한 순수 기하 함수들.
// Arcade physics는 축정렬 사각형(AABB) 판정만 지원해서, 대각선으로 눕힌 얇고 긴 모양은 이 함수들로 별도 보정한다.

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function pointToRectDistance(px, py, rect) {
  const cx = Math.max(rect.x, Math.min(px, rect.right));
  const cy = Math.max(rect.y, Math.min(py, rect.bottom));
  return Math.hypot(px - cx, py - cy);
}

// Liang-Barsky 파라메트릭 클리핑: 선분이 축정렬 사각형과 실제로 교차하는지 (겹치면 t 유효구간이 남는다)
function segmentIntersectsRect(x1, y1, x2, y2, rect) {
  let tMin = 0;
  let tMax = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rect.x, rect.right - x1, y1 - rect.y, rect.bottom - y1];

  for (let i = 0; i < 4; i += 1) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > tMax) return false;
        if (t > tMin) tMin = t;
      } else {
        if (t < tMin) return false;
        if (t < tMax) tMax = t;
      }
    }
  }
  return true;
}

// 두께가 있는 선분(캡슐: 중심축 + radius)이 축정렬 사각형과 겹치는지.
// 방망이의 손잡이→배럴 끝 중심선을 이 축으로 두면, 대각선 실루엣에 맞춘 히트 판정이 된다.
export function capsuleIntersectsRect(x1, y1, x2, y2, radius, rect) {
  if (segmentIntersectsRect(x1, y1, x2, y2, rect)) return true;

  const corners = [
    [rect.x, rect.y],
    [rect.right, rect.y],
    [rect.x, rect.bottom],
    [rect.right, rect.bottom],
  ];
  const distances = [
    pointToRectDistance(x1, y1, rect),
    pointToRectDistance(x2, y2, rect),
    ...corners.map(([cx, cy]) => pointToSegmentDistance(cx, cy, x1, y1, x2, y2)),
  ];
  return Math.min(...distances) <= radius;
}
