import { appState } from "@/data/apps";
import { handle, ok, readJson, resolveCaller } from "@/lib/apps-api";

/** Dữ liệu nhỏ của app theo người dùng: {} → { state }; { value: {…} } → ghi đè (JSON object ≤ 16KB). */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const c = await resolveCaller(request, body);
    return ok(await appState(c, body.value));
  } catch (e) {
    return handle(e, "state");
  }
}
