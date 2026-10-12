import "server-only";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

export interface AdminUser {
  id: string;
  email: string | null;
  giaoly_linked: boolean;
  plan: string | null;
  created_at: string;
  owned_count: number;
}

export async function adminListUsers(): Promise<AdminUser[]> {
  const supabase = createStoreAdminClient();
  const { data: profs, error } = await supabase
    .from("profiles")
    .select("id,email,giaoly_user_id,plan,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = profs ?? [];
  // đếm entitlements theo user
  const counts = new Map<string, number>();
  const { data: ents } = await supabase.from("entitlements").select("store_user_id");
  for (const e of ents ?? []) {
    counts.set(e.store_user_id, (counts.get(e.store_user_id) ?? 0) + 1);
  }

  return rows.map((p) => ({
    id: p.id,
    email: p.email,
    giaoly_linked: !!p.giaoly_user_id,
    plan: p.plan,
    created_at: p.created_at,
    owned_count: counts.get(p.id) ?? 0,
  }));
}

export interface UserItem {
  product_id: string;
  title: string;
  slug: string;
  granted_at: string;
}

export async function adminGetUserItems(userId: string): Promise<UserItem[]> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("entitlements")
    .select("product_id,granted_at,product:products(title,slug)")
    .eq("store_user_id", userId)
    .order("granted_at", { ascending: false });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as {
    product_id: string;
    granted_at: string;
    product: { title: string; slug: string } | null;
  }[]).map((e) => ({
    product_id: e.product_id,
    title: e.product?.title ?? "Sản phẩm",
    slug: e.product?.slug ?? "",
    granted_at: e.granted_at,
  }));
}

export async function adminGetUserEmail(userId: string): Promise<string | null> {
  const supabase = createStoreAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  return data?.email ?? null;
}

export interface ParishItem {
  product_id: string;
  title: string;
  slug: string;
  source: string;
  expires_at: string | null;
  active: boolean;
}

/** Tính năng Giáo Lý Số của giáo xứ mà user thuộc về (quyền theo giáo xứ — 0024). */
export async function adminGetUserParishItems(userId: string): Promise<{ parishId: string | null; items: ParishItem[] }> {
  const supabase = createStoreAdminClient();
  const { data: prof } = await supabase.from("profiles").select("parish_id").eq("id", userId).maybeSingle();
  const parishId = (prof?.parish_id as string | null) ?? null;
  if (!parishId) return { parishId: null, items: [] };
  const { data } = await supabase
    .from("parish_entitlements")
    .select("product_id,source,expires_at,product:products(title,slug)")
    .eq("parish_id", parishId)
    .order("updated_at", { ascending: false });
  const now = Date.now();
  const items = ((data ?? []) as unknown as {
    product_id: string;
    source: string;
    expires_at: string | null;
    product: { title: string; slug: string } | null;
  }[]).map((e) => ({
    product_id: e.product_id,
    title: e.product?.title ?? "Sản phẩm",
    slug: e.product?.slug ?? "",
    source: e.source,
    expires_at: e.expires_at,
    active: !e.expires_at || new Date(e.expires_at).getTime() > now,
  }));
  return { parishId, items };
}

export interface AdminLedgerRow {
  id: string;
  amount: number;
  balance_after: number;
  kind: string;
  ref: string | null;
  note: string | null;
  created_at: string;
  refunded_at: string | null;
  /** Tên sản phẩm / "Full Topping" / tên app (ref app:…) nếu xác định được. */
  label: string | null;
  /** Hoàn được ở trang admin: lượt trừ mua sản phẩm / topping / key, chưa hoàn (app tự hoàn qua API). */
  refundable: boolean;
}

/** Ví của user cho admin hỗ trợ: số dư, 50 dòng lịch sử gần nhất (kèm tên sản phẩm), 10 đơn nạp gần nhất. */
export async function adminGetUserWallet(userId: string) {
  const supabase = createStoreAdminClient();
  const [{ data: w }, { data: ledger }, { data: topups }] = await Promise.all([
    supabase.from("point_wallets").select("balance").eq("user_id", userId).maybeSingle(),
    supabase
      .from("point_ledger")
      .select("id,amount,balance_after,kind,ref,note,created_at,refunded_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("point_topups")
      .select("id,code,amount_vnd,points,status,created_at,reject_reason")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const rows = (ledger ?? []) as Omit<AdminLedgerRow, "label" | "refundable">[];
  const UUID = /^[0-9a-f-]{36}$/;
  const ids = [
    ...new Set(rows.map((r) => (r.ref ?? "").replace(/^app:/, "")).filter((x) => UUID.test(x))),
  ];
  const { data: prods } = ids.length
    ? await supabase.from("products").select("id,title").in("id", ids)
    : { data: [] as { id: string; title: string }[] };
  const title = new Map((prods ?? []).map((p) => [p.id, p.title]));
  const out: AdminLedgerRow[] = rows.map((r) => {
    const ref = r.ref ?? "";
    const label = ref === "topping" ? "Full Topping" : (title.get(ref.replace(/^app:/, "")) ?? null);
    return {
      ...r,
      label,
      refundable: r.kind === "spend" && r.amount < 0 && !ref.startsWith("app:") && !r.refunded_at,
    };
  });
  return { balance: (w?.balance as number | undefined) ?? 0, ledger: out, topups: topups ?? [] };
}
