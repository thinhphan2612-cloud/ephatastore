import "server-only";
import crypto from "node:crypto";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { normalizePlan } from "@/lib/plan";
import { signPayload, verifySignedPayload } from "@/lib/software/license";
import { verifyHostedToken } from "@/lib/hosted-access";

/**
 * Ví Ephata cho app: kết nối người dùng ↔ app, launch token, quyền truy cập, trừ / hoàn point.
 * App ngoài: xác thực bằng khóa bí mật server (products.app_secret_hash) + mã kết nối của người dùng.
 * App host trên store: xác thực bằng mã truy cập trong URL (/g/<id>/<mã>/) + phiên đăng nhập trùng người.
 */

export class AppError extends Error {
  constructor(public code: string, public status = 200, public extra: Record<string, unknown> = {}) {
    super(code);
  }
}

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const LAUNCH_TTL_MS = 5 * 60 * 1000;

export interface AppProduct {
  id: string;
  slug: string;
  title: string;
  type: string;
  tier: string;
  price_month: number;
  giaoly_pro_free: boolean;
  uses_wallet: boolean;
  app_url: string | null;
  game_url: string | null;
  app_secret_hash: string | null;
}

const PRODUCT_SELECT =
  "id,slug,title,type,tier,price_month,giaoly_pro_free,uses_wallet,app_url,game_url,app_secret_hash";

export async function getAppProductById(id: string): Promise<AppProduct | null> {
  const { data } = await createStoreAdminClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  return (data as AppProduct | null) ?? null;
}

async function getAppProductBySlug(slug: string): Promise<AppProduct | null> {
  const { data } = await createStoreAdminClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return (data as AppProduct | null) ?? null;
}

// ---------- Quyền truy cập theo userId (không dựa vào phiên — server app ngoài gọi sang) ----------

/** { active, until }: until = null nghĩa là vĩnh viễn (khi active). */
export async function accessFor(
  userId: string,
  p: Pick<AppProduct, "id" | "type" | "tier" | "price_month" | "giaoly_pro_free">
): Promise<{ active: boolean; until: string | null }> {
  if (p.tier !== "pro" && (p.price_month ?? 0) <= 0) return { active: true, until: null };
  const supabase = createStoreAdminClient();
  const now = new Date().toISOString();

  if (p.giaoly_pro_free && p.type !== "software") {
    const { data: prof } = await supabase
      .from("profiles")
      .select("giaoly_user_id,plan")
      .eq("id", userId)
      .maybeSingle();
    if (prof?.giaoly_user_id && normalizePlan(prof.plan) === "pro") return { active: true, until: null };
  }

  const { data: ent } = await supabase
    .from("entitlements")
    .select("expires_at")
    .eq("store_user_id", userId)
    .eq("product_id", p.id)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle();
  if (ent) return { active: true, until: ent.expires_at };

  if (p.type !== "software") {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("expires_at")
      .eq("store_user_id", userId)
      .gt("expires_at", now)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sub) return { active: true, until: sub.expires_at };
  }
  return { active: false, until: null };
}

// ---------- Kết nối ----------

export async function getConnection(productId: string, userId: string) {
  const { data } = await createStoreAdminClient()
    .from("app_connections")
    .select("id,revoked_at,created_at")
    .eq("product_id", productId)
    .eq("store_user_id", userId)
    .maybeSingle();
  return data;
}

export async function hasActiveConnection(productId: string, userId: string): Promise<boolean> {
  const c = await getConnection(productId, userId);
  return !!c && !c.revoked_at;
}

/** Người dùng đồng ý (hoặc kết nối lại sau khi ngắt). */
export async function connect(productId: string, userId: string): Promise<void> {
  const { error } = await createStoreAdminClient()
    .from("app_connections")
    .upsert(
      { product_id: productId, store_user_id: userId, revoked_at: null },
      { onConflict: "product_id,store_user_id" }
    );
  if (error) throw new Error(error.message);
}

export async function disconnect(connectionId: string, userId: string): Promise<void> {
  await createStoreAdminClient()
    .from("app_connections")
    .update({ revoked_at: new Date().toISOString(), token_hash: null })
    .eq("id", connectionId)
    .eq("store_user_id", userId);
}

export interface MyConnection {
  id: string;
  created_at: string;
  last_used_at: string | null;
  product: { id: string; slug: string; title: string; icon: string | null; uses_wallet: boolean } | null;
}

export async function listMyConnections(userId: string): Promise<MyConnection[]> {
  const { data } = await createStoreAdminClient()
    .from("app_connections")
    .select("id,created_at,last_used_at,product:products(id,slug,title,icon,uses_wallet)")
    .eq("store_user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as MyConnection[];
}

// ---------- Launch token (Ephata → app ngoài, 5 phút) ----------

export async function createLaunchToken(p: AppProduct, user: { id: string; email?: string | null }): Promise<string> {
  const access = await accessFor(user.id, p);
  const now = Date.now();
  return signPayload({
    typ: "ephata-launch",
    product: p.slug,
    sub: user.id,
    email: user.email ?? null,
    access: { active: access.active, until: access.until },
    wallet: p.uses_wallet,
    iat: now,
    exp: now + LAUNCH_TTL_MS,
    jti: crypto.randomUUID(),
  });
}

function readLaunchToken(token: string, slug: string): { sub: string; email: string | null } {
  const p = verifySignedPayload(token);
  if (!p || p.typ !== "ephata-launch") throw new AppError("TOKEN_INVALID");
  if (p.product !== slug) throw new AppError("PRODUCT_MISMATCH");
  if (typeof p.exp !== "number" || p.exp < Date.now()) throw new AppError("TOKEN_EXPIRED");
  return { sub: String(p.sub), email: (p.email as string | null) ?? null };
}

// ---------- Xác thực bên gọi API ----------

export interface Caller {
  product: AppProduct;
  userId: string;
}

/** App ngoài: khóa bí mật server của app (Authorization: Bearer) + slug sản phẩm. */
export async function authenticateApp(request: Request, slug: unknown): Promise<AppProduct> {
  const secret = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (typeof slug !== "string" || !slug) throw new AppError("BAD_REQUEST", 400);
  const product = await getAppProductBySlug(slug);
  if (!product || !product.app_secret_hash || !secret) throw new AppError("APP_UNAUTHORIZED", 401);
  const a = Buffer.from(sha256(secret));
  const b = Buffer.from(product.app_secret_hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new AppError("APP_UNAUTHORIZED", 401);
  return product;
}

/** Đổi launch token lấy mã kết nối dài hạn (lưu ở server app, dùng để trừ point / kiểm quyền). */
export async function exchangeLaunchToken(product: AppProduct, launchToken: string) {
  const { sub, email } = readLaunchToken(launchToken, product.slug);
  const conn = await getConnection(product.id, sub);
  if (!conn || conn.revoked_at) throw new AppError("CONNECTION_REVOKED");
  const token = crypto.randomBytes(32).toString("base64url");
  const { error } = await createStoreAdminClient()
    .from("app_connections")
    .update({ token_hash: sha256(token), last_used_at: new Date().toISOString() })
    .eq("id", conn.id);
  if (error) throw new Error(error.message);
  return { userId: sub, email, connection: token, access: await accessFor(sub, product) };
}

/** Người dùng sau mã kết nối (app ngoài). */
export async function callerFromConnection(product: AppProduct, connection: unknown): Promise<Caller> {
  if (typeof connection !== "string" || !connection) throw new AppError("BAD_REQUEST", 400);
  const { data } = await createStoreAdminClient()
    .from("app_connections")
    .select("id,store_user_id,revoked_at")
    .eq("product_id", product.id)
    .eq("token_hash", sha256(connection))
    .maybeSingle();
  if (!data || data.revoked_at) throw new AppError("CONNECTION_REVOKED");
  await createStoreAdminClient()
    .from("app_connections")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return { product, userId: data.store_user_id };
}

/** App host trên store: mã trong URL /g/<gameId>/<mã>/ + phiên đăng nhập phải cùng người. */
export async function callerFromHosted(hostedPath: string | null, sessionUserId: string | null): Promise<Caller> {
  const m = hostedPath?.match(/\/g\/([0-9a-f-]{36})\/([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\//);
  if (!m) throw new AppError("BAD_REQUEST", 400);
  const userId = verifyHostedToken(m[2], m[1]);
  if (!userId) throw new AppError("TOKEN_INVALID", 401);
  if (!sessionUserId || sessionUserId !== userId) throw new AppError("NOT_SIGNED_IN", 401);
  const { data } = await createStoreAdminClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .like("game_url", `/g/${m[1]}/%`)
    .maybeSingle();
  const product = data as AppProduct | null;
  if (!product) throw new AppError("PRODUCT_NOT_FOUND", 404);
  if (!(await hasActiveConnection(product.id, userId))) throw new AppError("CONNECTION_REVOKED");
  return { product, userId };
}

// ---------- Point ----------

export async function getBalanceOf(userId: string): Promise<number> {
  const { data } = await createStoreAdminClient()
    .from("point_wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.balance ?? 0;
}

export async function chargePoints(c: Caller, amount: unknown, reason: unknown, key: unknown) {
  if (!c.product.uses_wallet) throw new AppError("WALLET_DISABLED");
  if (!Number.isInteger(amount) || (amount as number) <= 0 || (amount as number) > 10_000_000)
    throw new AppError("BAD_REQUEST", 400);
  if (typeof reason !== "string" || !reason.trim() || typeof key !== "string" || !key || key.length > 200)
    throw new AppError("BAD_REQUEST", 400);
  const { data, error } = await createStoreAdminClient().rpc("app_charge", {
    p_product: c.product.id,
    p_user: c.userId,
    p_amount: amount,
    p_reason: reason.trim(),
    p_key: key,
  });
  if (error) {
    if (/INSUFFICIENT_POINTS/.test(error.message)) {
      throw new AppError("INSUFFICIENT_POINTS", 200, {
        needed: amount,
        balance: await getBalanceOf(c.userId),
        topupUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || "https://www.ephatastore.com").replace(/\/$/, "")}/wallet`,
      });
    }
    if (/IDEMPOTENCY_CONFLICT/.test(error.message)) throw new AppError("IDEMPOTENCY_CONFLICT");
    throw new Error(error.message);
  }
  const d = data as { charge_id: string; balance: number; duplicate: boolean };
  return { chargeId: d.charge_id, balance: d.balance, duplicate: d.duplicate };
}

export async function refundPoints(c: Caller, chargeId: unknown, amount: unknown) {
  if (typeof chargeId !== "string" || !chargeId) throw new AppError("BAD_REQUEST", 400);
  if (amount !== undefined && (!Number.isInteger(amount) || (amount as number) <= 0))
    throw new AppError("BAD_REQUEST", 400);
  // Chỉ hoàn lần trừ của chính người dùng này ở chính app này.
  const { data: ch } = await createStoreAdminClient()
    .from("app_charges")
    .select("store_user_id")
    .eq("id", chargeId)
    .eq("product_id", c.product.id)
    .maybeSingle();
  if (!ch || ch.store_user_id !== c.userId) throw new AppError("CHARGE_NOT_FOUND");
  const { data, error } = await createStoreAdminClient().rpc("app_refund", {
    p_product: c.product.id,
    p_charge: chargeId,
    p_amount: amount ?? null,
  });
  if (error) {
    if (/CHARGE_NOT_FOUND|REFUND_EXCEEDS_CHARGE/.test(error.message))
      throw new AppError(error.message.match(/CHARGE_NOT_FOUND|REFUND_EXCEEDS_CHARGE/)![0]);
    throw new Error(error.message);
  }
  const d = data as { refunded: number; balance: number };
  return { refunded: d.refunded, balance: d.balance };
}

// ---------- Khóa bí mật server của app ngoài ----------

/** Tạo khóa mới (khóa cũ hết hiệu lực ngay). Trả khóa dạng rõ — chỉ hiển thị một lần. */
export async function rotateAppSecret(productId: string): Promise<string> {
  const secret = `eps_${crypto.randomBytes(32).toString("base64url")}`;
  const { error } = await createStoreAdminClient()
    .from("products")
    .update({ app_secret_hash: sha256(secret) })
    .eq("id", productId);
  if (error) throw new Error(error.message);
  return secret;
}
