import { VND_PER_POINT } from "@/lib/points";

/**
 * Bảng giá AI → point. Chỉnh mọi tham số ở đây.
 * Giá gốc gemini-3.1-pro (USD/1M token), có ngưỡng ngữ cảnh dài:
 *  - ≤ 200k token:  input $2  / output $12
 *  - > 200k token:  input $4  / output $18  (toàn bộ request tính mức cao)
 * Giá user = giá gốc × MARKUP, quy VND theo USD_TO_VND, rồi ra point.
 */
export const AI_MODEL = "gemini-3.1-pro-preview";

/** Trần output token mặc định (giới hạn chi phí + estimate). Request có thể xin thấp hơn. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

const CONTEXT_THRESHOLD = 200_000;
const RATE = {
  standard: { input: 2, output: 12 }, // USD / 1M token
  long: { input: 4, output: 18 },
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
