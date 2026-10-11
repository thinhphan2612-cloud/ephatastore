import { AppError, authenticateApp, exchangeLaunchToken } from "@/data/apps";
import { handle, ok, readJson } from "@/lib/apps-api";

/** App ngoài đổi launch token (?ephata_token=) lấy mã kết nối dài hạn + thông tin người dùng. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const product = await authenticateApp(request, body.product);
    if (typeof body.launchToken !== "string" || !body.launchToken) throw new AppError("BAD_REQUEST", 400);
    const r = await exchangeLaunchToken(product, body.launchToken);
    return ok({ user: { id: r.userId, email: r.email }, connection: r.connection, access: r.access });
  } catch (e) {
    return handle(e, "connect");
  }
}
