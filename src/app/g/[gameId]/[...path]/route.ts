import { NextResponse, type NextRequest } from "next/server";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { hostedOrigin, isHostedHostAllowed, verifyHostedToken } from "@/lib/hosted-access";

/**
 * Phục vụ file game / công cụ web host trên store (bucket PRIVATE 'games').
 * URL: /g/<gameId>/<token>/<file> — token do trang chơi cấp (lib/hosted-access), kiểm chữ ký mỗi request.
 * - HTML/JS/CSS/JSON: tải từ Storage rồi trả với content-type đúng (cùng origin với store).
 * - Ảnh/âm thanh/video/font/wasm…: redirect sang link ký có hạn của Storage (không đi qua function —
 *   Vercel giới hạn response ~4.5MB).
 */
const PROXY: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json; charset=utf-8",
};
const BUCKET = "games";
const SIGNED_TTL = 60 * 60; // 1 giờ

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string; path: string[] }> }
) {
  // Có origin riêng → TUYỆT ĐỐI không phục vụ code app trên domain store (chống mượn mã truy cập để chạy trên www).
  // Chuyển sang origin riêng thay vì 404 để link cũ (vd đã gửi sang Giáo Lý Số) vẫn chạy.
  if (!isHostedHostAllowed(req.headers.get("host"))) {
    return NextResponse.redirect(`${hostedOrigin()}${req.nextUrl.pathname}${req.nextUrl.search}`, 308);
  }
  const { gameId, path } = await params;
  const [token, ...rest] = path ?? [];
  const rel = rest.join("/");
  if (!token || !rel || rel.split("/").includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!verifyHostedToken(token, gameId)) {
    return new NextResponse("Phiên chơi đã hết hạn hoặc không hợp lệ. Mở lại từ trang sản phẩm trên Ephata Store.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const storage = createStoreAdminClient().storage.from(BUCKET);
  const objectPath = `${gameId}/${rel}`;
  const ext = rel.split(".").pop()?.toLowerCase() ?? "";
  const proxyType = PROXY[ext];

  if (!proxyType) {
    const { data, error } = await storage.createSignedUrl(objectPath, SIGNED_TTL);
    if (error || !data?.signedUrl) return new NextResponse("Not found", { status: 404 });
    return NextResponse.redirect(data.signedUrl, 302);
  }

  const { data, error } = await storage.download(objectPath);
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "content-type": proxyType,
      // URL chứa token theo phiên → chỉ trình duyệt người chơi được cache.
      "cache-control": "private, max-age=3600",
    },
  });
}
