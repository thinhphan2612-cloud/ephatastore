import { chargePoints } from "@/data/apps";
import { handle, ok, readJson, resolveCaller } from "@/lib/apps-api";

/**
 * Trừ point cho một lần dùng dịch vụ: { amount, reason, idempotencyKey }.
 * Gửi lại cùng idempotencyKey → trả kết quả cũ (duplicate: true), không trừ lần 2.
 */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const c = await resolveCaller(request, body);
    return ok(await chargePoints(c, body.amount, body.reason, body.idempotencyKey));
  } catch (e) {
    return handle(e, "charge");
  }
}
