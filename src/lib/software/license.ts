import "server-only";
import crypto from "node:crypto";

/**
 * Lõi cấp phép phần mềm (spec: docs/software-licensing.md).
 * Token = base64url(payloadJSON) + "." + base64url(ed25519_sign(payloadB64)) — khớp license.rs của Gelo.
 * Khóa ký: env SOFTWARE_LICENSE_SIGNING_JWK (JWK private Ed25519, server-only). Sinh bằng scripts/gen-license-keys.mjs.
 */

/** license_offline_days = 0 nghĩa là dùng offline vĩnh viễn — token hết hạn sau ~100 năm. */
const PERMANENT_OFFLINE_DAYS = 36500;

/** Bỏ ký tự dễ nhầm (0/O, 1/I). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class LicenseError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

let cachedKey: crypto.KeyObject | null = null;

function signingKey(): crypto.KeyObject {
  if (cachedKey) return cachedKey;
  const raw = process.env.SOFTWARE_LICENSE_SIGNING_JWK;
  if (!raw) throw new Error("Thiếu SOFTWARE_LICENSE_SIGNING_JWK");
  cachedKey = crypto.createPrivateKey({ key: JSON.parse(raw), format: "jwk" });
  return cachedKey;
}

/** Public key Ed25519 dạng base64 chuẩn (32 byte) — nhúng vào app. */
export function publicKeyBase64(): string {
  const jwk = crypto.createPublicKey(signingKey()).export({ format: "jwk" });
  return Buffer.from(String(jwk.x), "base64url").toString("base64");
}

function randomGroup(): string {
  let out = "";
  for (const b of crypto.randomBytes(4)) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** Key "<PREFIX>-XXXX-XXXX-XXXX", tiền tố = 4 ký tự đầu slug viết hoa. */
export function generateLicenseKey(slug: string): string {
  const prefix = slug.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "KEY";
  return `${prefix}-${randomGroup()}-${randomGroup()}-${randomGroup()}`;
}

export function normalizeKey(key: string): string {
  return key.trim().toUpperCase();
}

export function issueToken(opts: {
  product: string;
  key: string;
  deviceId: string;
  offlineDays: number;
}): string {
  const now = Date.now();
  const payload = {
    product: opts.product,
    key: opts.key,
    deviceId: opts.deviceId,
    plan: "pro", // client Gelo chỉ chấp nhận plan == "pro"
    features: [] as string[],
    issuedAt: now,
    // offlineDays = 0 → vĩnh viễn: lùi hạn 100 năm (app không cần đổi gì, vẫn so now <= offlineExpiresAt).
    offlineExpiresAt: now + (opts.offlineDays > 0 ? opts.offlineDays : PERMANENT_OFFLINE_DAYS) * 86400000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.sign(null, Buffer.from(payloadB64), signingKey());
  return `${payloadB64}.${sig.toString("base64url")}`;
}

/** Đọc key từ payload token (không verify chữ ký — quyền quyết định nằm ở DB). */
export function keyFromToken(token: string): string {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[0], "base64url").toString("utf8")
    );
    if (typeof payload.key === "string" && payload.key) return normalizeKey(payload.key);
  } catch {}
  throw new LicenseError("TOKEN_MALFORMED");
}
