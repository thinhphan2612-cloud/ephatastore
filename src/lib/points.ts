/** Quy đổi tiền ↔ point cho Ví. Đổi ở đây nếu cần chỉnh tỉ lệ. */

/** 100đ = 1 point. */
export const VND_PER_POINT = 100;

/** Số tiền (VND) → point (làm tròn xuống). */
export function vndToPoints(vnd: number): number {
  return Math.floor(vnd / VND_PER_POINT);
}

/** Point → VND. */
export function pointsToVnd(points: number): number {
  return points * VND_PER_POINT;
}

/** Mệnh giá nạp gợi ý (VND). */
export const TOPUP_PRESETS = [50000, 100000, 200000, 500000, 1000000];
