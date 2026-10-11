import { NextResponse, type NextRequest } from "next/server";

/**
 * Phục vụ file webgame đã host trên Supabase Storage (bucket 'games').
 * - HTML/JS/CSS/JSON: proxy + set content-type đúng (Supabase ép HTML thành text/plain).
 * - Media/ảnh/font: redirect thẳng về public URL của Supabase (không tốn băng thông).
 */
const PROXY: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json; charset=utf-8",
};

function publicUrl(gameId: string, rel: string): string {
  return `${process.env.NEXT_PUBLIC_STORE_SUPABASE_URL}/storage/v1/object/public/games/${gameId}/${rel}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string; path: string[] }> }
) {
  const { gameId, path } = await params;
  const rel = (path ?? []).join("/");
  const url = publicUrl(gameId, rel);
  const ext = rel.split(".").pop()?.toLowerCase() ?? "";

  const proxyType = PROXY[ext];
  if (!proxyType) {
    // media / ảnh / font → để browser tải thẳng từ Supabase (đúng content-type)
    return NextResponse.redirect(url, 307);
  }

  const res = await fetch(url);
  if (!res.ok) return new NextResponse("Not found", { status: 404 });
  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "content-type": proxyType,
      "cache-control": "public, max-age=300",
    },
  });
}
