import { refundPoints } from "@/data/apps";
import { handle, ok, readJson, resolveCaller } from "@/lib/apps-api";

/** Hoàn point cho một lần trừ: { chargeId, amount? } (bỏ amount = hoàn phần còn lại). */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const c = await resolveCaller(request, body);
    return ok(await refundPoints(c, body.chargeId, body.amount));
  } catch (e) {
    return handle(e, "refund");
  }
}
