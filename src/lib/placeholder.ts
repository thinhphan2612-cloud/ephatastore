/**
 * Sinh ảnh bìa placeholder dạng gradient tất định từ một chuỗi seed.
 * Dùng tạm ở MVP để không phụ thuộc ảnh ngoài; sau này thay bằng ảnh upload thật.
 */

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Trả về CSS background (linear-gradient) tất định theo seed. */
export function gradientFor(seed: string): string {
  const h = hash(seed);
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + (h % 60)) % 360;
  const angle = 120 + (h % 100);
  return `linear-gradient(${angle}deg, hsl(${hue1} 45% 24%), hsl(${hue2} 55% 16%))`;
}
