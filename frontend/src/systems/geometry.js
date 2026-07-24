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

// 중심 (rectX,rectY), 반너비/반높이 (halfW,halfH)인 축정렬 사각형이 고정된 캡슐(x1,y1)-(x2,y2, radius)을
// contactOverlap만큼만 겹친 채로 남기고 밀려난 위치를 반환 (겹치지 않으면 원래 좌표 그대로).
//
// 1) 사각형 중심에서 캡슐 축(선분)에 내린 가장 가까운 점 Q를 구하고
// 2) Q를 사각형 경계로 클램프한 점 C(=사각형에서 Q에 가장 가까운 점)를 구해
// 3) C→Q 방향(사각형이 캡슐 축으로부터 밀려나야 할 방향)으로 부족한 만큼 사각형을 밀어낸다.
// (2단계에서 클램프를 쓰기 때문에 사각형의 모서리 방향으로 접근할 때도 정확하다 — 중심 방향만으로 근사하지 않음)
export function pushRectOutOfCapsule(rectX, rectY, halfW, halfH, x1, y1, x2, y2, radius, contactOverlap) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((rectX - x1) * dx + (rectY - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;

  const cx = Math.max(rectX - halfW, Math.min(qx, rectX + halfW));
  const cy = Math.max(rectY - halfH, Math.min(qy, rectY + halfH));
  const ndx = cx - qx;
  const ndy = cy - qy;
  const dist = Math.hypot(ndx, ndy);
  const minDist = radius - contactOverlap;

  if (dist >= minDist) return { x: rectX, y: rectY };

  const nx = dist === 0 ? 0 : ndx / dist;
  const ny = dist === 0 ? -1 : ndy / dist;
  const push = minDist - dist;
  return { x: rectX + nx * push, y: rectY + ny * push };
}
