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

/** "/g/<id>/index.html" → { gameId, entry } (entry = file mở đầu). */
export function parseGameUrl(gameUrl: string | null | undefined): { gameId: string; entry: string } | null {
  const m = gameUrl?.match(/^\/g\/([0-9a-f-]{36})\/(.+)$/);
  return m ? { gameId: m[1], entry: m[2] } : null;
}

/** URL chơi có mã truy cập (tương đối với site). */
export function hostedPlayUrl(gameUrl: string, userId: string, ttlMs = PLAY_TOKEN_TTL_MS): string | null {
  const g = parseGameUrl(gameUrl);
  return g ? `/g/${g.gameId}/${createHostedToken(g.gameId, userId, ttlMs)}/${g.entry}` : null;
}
