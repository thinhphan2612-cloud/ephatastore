import "server-only";
import { NextResponse } from "next/server";
import { hostedOrigin } from "@/lib/hosted-access";
import { getCurrentUser } from "@/lib/auth";
import {
  AppError,
  authenticateApp,
  callerFromConnection,
  callerFromHosted,
  type Caller,
} from "@/data/apps";

/**
 * Helper cho /api/apps/v1. JSON vào/ra. Lỗi nghiệp vụ: HTTP 200 {ok:false, error}; body sai 400; xác thực sai 401.
 * Bên gọi:
 *  - App ngoài (server): header Authorization: Bearer <khóa bí mật>, body { product, connection, ... }.
 *  - App host trên store (trình duyệt): header X-Ephata-Hosted: location.pathname, cookie phiên đăng nhập.
 */

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const b = await request.json();
    if (b && typeof b === "object") return b as Record<string, unknown>;
  } catch {}
  throw new AppError("BAD_REQUEST", 400);
}

export async function resolveCaller(request: Request, body: Record<string, unknown>): Promise<Caller> {
  const hosted = request.headers.get("x-ephata-hosted");
  if (hosted) {
    // Có origin riêng: app chạy ở domain không có cookie store → mã truy cập (ký, gắn game + người, 12h) là đủ.
    // Cùng origin (local / preview): bắt buộc thêm phiên đăng nhập trùng người.
    if (hostedOrigin()) return callerFromHosted(hosted, null, false);
    const user = await getCurrentUser();
    return callerFromHosted(hosted, user?.id ?? null, true);
  }
  const product = await authenticateApp(request, body.product);
  return callerFromConnection(product, body.connection);
}

export function ok(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data });
}

export function handle(e: unknown, where: string) {
  if (e instanceof AppError) {
    return NextResponse.json({ ok: false, error: e.code, ...e.extra }, { status: e.status });
  }
  console.error(`apps api ${where}`, e);
  return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
}
