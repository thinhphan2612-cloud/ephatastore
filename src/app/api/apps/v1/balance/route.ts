import { getBalanceOf } from "@/data/apps";
import { handle, ok, readJson, resolveCaller } from "@/lib/apps-api";

/** Số dư point của người dùng (app ngoài hoặc app host trên store). */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const c = await resolveCaller(request, body);
    return ok({ balance: await getBalanceOf(c.userId) });
  } catch (e) {
    return handle(e, "balance");
  }
}
