import type { V3 } from './motion-3d';
export const add = (a: V3, b: V3): V3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
export const sub = (a: V3, b: V3): V3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
export const mul = (a: V3, n: number): V3 => [a[0] * n, a[1] * n, a[2] * n];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const length = (a: V3) => Math.hypot(...a);
export const unit = (a: V3): V3 => mul(a, 1 / (length(a) || 1));
export const distance = (a: V3, b: V3) => length(sub(a, b));
/** Analytical two-bone IK. The elbow/knee bends toward its anatomical pole.
 * Segment lengths are preserved; unreachable targets are clamped, never stretched. */
export function solveLimb(
  start: V3,
  target: V3,
  pole: V3,
  upper: number,
  lower: number,
) {
  const direction = unit(sub(target, start));
  const reach = Math.min(
    upper + lower - 0.0001,
    Math.max(Math.abs(upper - lower) + 0.0001, distance(start, target)),
  );
  const end = add(start, mul(direction, reach));
  const along = (upper * upper - lower * lower + reach * reach) / (2 * reach);
  const toPole = sub(pole, start);
  let bend = sub(toPole, mul(direction, dot(toPole, direction)));
  if (length(bend) < 0.00001) {
    const fallback: V3 = Math.abs(direction[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
    bend = sub(fallback, mul(direction, dot(fallback, direction)));
  }
  const joint = add(
    add(start, mul(direction, along)),
    mul(unit(bend), Math.sqrt(Math.max(0, upper * upper - along * along))),
  );
  return { joint, end, error: distance(target, end) };
}
