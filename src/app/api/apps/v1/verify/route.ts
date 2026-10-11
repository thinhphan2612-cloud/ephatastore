import { accessFor, callerFromConnection, authenticateApp } from "@/data/apps";
import { handle, ok, readJson } from "@/lib/apps-api";

/** App ngoài kiểm quyền HIỆN TẠI của người dùng (theo mã kết nối): { access: { active, until } }. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const product = await authenticateApp(request, body.product);
    const c = await callerFromConnection(product, body.connection);
    return ok({ user: { id: c.userId }, access: await accessFor(c.userId, product) });
  } catch (e) {
    return handle(e, "verify");
  }
}
