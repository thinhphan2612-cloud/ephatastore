import { VND_PER_POINT } from "@/lib/points";

/**
 * Bảng giá AI → point. Chỉnh mọi tham số ở đây.
 * Dùng gemini-3.5-flash (chạy được free tier — Felix chưa bật billing).
 *
 * ⚠️ GIÁ GỐC FLASH DƯỚI ĐÂY LÀ TẠM (theo bậc Flash) — cần xác nhận giá chính thức
 * của gemini-3.5-flash rồi chỉnh lại. Khi còn trong hạn mức free tier thì thực tế
 * Google không thu tiền; giá này để tính point user + đúng khi vượt free tier.
 * Lưu ý: output GỒM CẢ thinking tokens (model này "suy nghĩ" tốn token).
 *
 * Giá user = giá gốc × MARKUP, quy VND theo USD_TO_VND, rồi ra point.
 */
export const AI_MODEL = "gemini-3.5-flash";

/** Trần output token mặc định (gồm cả thinking). Đủ lớn để câu trả lời không bị cụt. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 16384;

const CONTEXT_THRESHOLD = 200_000;
const RATE = {
  standard: { input: 0.3, output: 2.5 }, // USD / 1M token — TẠM, xác nhận lại
  long: { input: 0.6, output: 5.0 },
};
const MARKUP = 5;
export const USD_TO_VND = 26_000;

function usdCost(inputTok: number, outputTok: number): number {
  const r = inputTok > CONTEXT_THRESHOLD ? RATE.long : RATE.standard;
  return (inputTok / 1e6) * r.input + (outputTok / 1e6) * r.output;
}

/** USD gốc → point user phải trả (đã ×markup, quy VND, làm tròn LÊN). */
function toPoints(usd: number): number {
  const vnd = usd * MARKUP * USD_TO_VND;
  return Math.ceil(vnd / VND_PER_POINT);
}

/** Giá tối đa (point) để HOLD trước khi chạy: input thực + trần output. */
export function estimateMaxPoints(inputTok: number, maxOutputTok: number): number {
  return toPoints(usdCost(inputTok, maxOutputTok));
}

/** Giá thực (point) sau khi chạy, từ usage thật (output gồm cả thinking tokens). */
export function actualPoints(inputTok: number, outputTok: number): number {
  return toPoints(usdCost(inputTok, outputTok));
}
