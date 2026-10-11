import "server-only";
import crypto from "node:crypto";

/**
 * Mã truy cập file game / công cụ web host trên store (bucket PRIVATE 'games').
 * URL chơi: /g/<gameId>/<token>/<file> — đường dẫn tương đối trong game tự mang theo token,
 * nên không cần cookie (chạy được cả khi nhúng ở domain khác, vd Giáo Lý Số).
 * token = base64url({g, u, e}) + "." + base64url(HMAC-SHA256). Kiểm chữ ký, không truy vấn DB.
 */

/** Hạn mã khi chơi trên store. */
export const PLAY_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
/** Hạn mã gửi sang Giáo Lý Số (nhúng lâu dài trong app của giáo xứ). */
export const EMBED_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

function key(): Buffer {
  const secret = process.env.STORE_SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Thiếu STORE_SUPABASE_SERVICE_ROLE_KEY");
  // Khóa dẫn xuất riêng cho mục đích này (không dùng thẳng service key).
  return crypto.createHash("sha256").update(`ephata-hosted-access:${secret}`).digest();
}

const sign = (data: string) => crypto.createHmac("sha256", key()).update(data).digest("base64url");

export function createHostedToken(gameId: string, userId: string, ttlMs = PLAY_TOKEN_TTL_MS): string {
  const payload = Buffer.from(JSON.stringify({ g: gameId, u: userId, e: Date.now() + ttlMs })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Hợp lệ khi đúng chữ ký, đúng game và chưa hết hạn. Trả userId hoặc null. */
export function verifyHostedToken(token: string, gameId: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (p.g !== gameId || typeof p.e !== "number" || p.e < Date.now()) return null;
    return typeof p.u === "string" ? p.u : null;
  } catch {
    return null;
  }
}

/**
 * Mã nhúng ỔN ĐỊNH cho Giáo Lý Số: gắn với SẢN PHẨM + người (không gắn bản build) → link /e/<productId>/<mã>
 * vẫn chạy sau khi thay / quay lại bản build (route /e chuyển tới bản đang chạy kèm mã chơi mới).
 * Payload có `p` (không có `g`) nên không dùng thay mã chơi /g được và ngược lại.
 */
export function createEmbedToken(productId: string, userId: string, ttlMs = EMBED_TOKEN_TTL_MS): string {
  const payload = Buffer.from(JSON.stringify({ p: productId, u: userId, e: Date.now() + ttlMs })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Hợp lệ khi đúng chữ ký, đúng sản phẩm và chưa hết hạn. Trả userId hoặc null. */
export function verifyEmbedToken(token: string, productId: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (p.g !== undefined || p.p !== productId || typeof p.e !== "number" || p.e < Date.now()) return null;
    return typeof p.u === "string" ? p.u : null;
  } catch {
    return null;
  }
}

/** "/g/<id>/index.html" → { gameId, entry } (entry = file mở đầu). */
export function parseGameUrl(gameUrl: string | null | undefined): { gameId: string; entry: string } | null {
  const m = gameUrl?.match(/^\/g\/([0-9a-f-]{36})\/(.+)$/);
  return m ? { gameId: m[1], entry: m[2] } : null;
}

/**
 * Origin riêng cho app host (vd https://play.ephatastore.com) — code app chạy ở đó KHÔNG đọc được cookie /
 * localStorage của store. Chưa cấu hình (local / preview) → chạy cùng origin với store.
 */
export function hostedOrigin(): string {
  return (process.env.HOSTED_ORIGIN ?? "").replace(/\/$/, "");
}

/** true nếu request được phép phục vụ app host: có origin riêng thì CHỈ host đó. */
export function isHostedHostAllowed(host: string | null): boolean {
  const origin = hostedOrigin();
  if (!origin) return true;
  return !!host && host.toLowerCase() === new URL(origin).host.toLowerCase();
}

/** URL chơi có mã truy cập (tuyệt đối khi có origin riêng). */
export function hostedPlayUrl(gameUrl: string, userId: string, ttlMs = PLAY_TOKEN_TTL_MS): string | null {
  const g = parseGameUrl(gameUrl);
  return g ? `${hostedOrigin()}/g/${g.gameId}/${createHostedToken(g.gameId, userId, ttlMs)}/${g.entry}` : null;
}
