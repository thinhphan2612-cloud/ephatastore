import "server-only";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

export interface LedgerEntry {
  id: string;
  amount: number;
  balance_after: number;
  kind: string;
  ref: string | null;
  note: string | null;
  created_at: string;
  /** Tên app khi giao dịch do app trừ / hoàn qua Ví Ephata (ref = "app:<product id>"). */
  appTitle?: string;
}

export interface Topup {
  id: string;
  user_id: string;
  code: string;
  amount_vnd: number;
  points: number;
  status: string;
  created_at: string;
}

/** Số dư point của user (0 nếu chưa có ví). */
export async function getBalance(userId: string): Promise<number> {
  const supabase = createStoreAdminClient();
  const { data } = await supabase
    .from("point_wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.balance ?? 0;
}

/** Lịch sử giao dịch point gần đây của user. */
export async function getLedger(userId: string, limit = 20): Promise<LedgerEntry[]> {
  const supabase = createStoreAdminClient();
  const { data } = await supabase
    .from("point_ledger")
    .select("id,amount,balance_after,kind,ref,note,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as LedgerEntry[];
  // ref = "app:<id>" (dịch vụ trong app) hoặc "<id>" (mua sản phẩm / key) hoặc "topping" → hiện tên để người dùng biết đã chi cho gì.
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const productIdOf = (ref: string | null) => {
    const id = ref?.replace(/^app:/, "");
    return id && UUID.test(id) ? id : null;
  };
  const ids = [...new Set(rows.map((r) => productIdOf(r.ref)).filter((x): x is string => !!x))];
  const titles = new Map<string, string>();
  if (ids.length) {
    const { data: prods } = await supabase.from("products").select("id,title").in("id", ids);
    for (const p of prods ?? []) titles.set(p.id as string, p.title as string);
  }
  for (const r of rows) {
    const id = productIdOf(r.ref);
    r.appTitle = r.ref === "topping" ? "Full Topping" : id ? (titles.get(id) ?? "(sản phẩm đã gỡ)") : undefined;
  }
  return rows;
}

/** Đơn nạp của user (kiểm cả chủ sở hữu). */
export async function getTopupForUser(id: string, userId: string): Promise<Topup | null> {
  const supabase = createStoreAdminClient();
  const { data } = await supabase
    .from("point_topups")
    .select("id,user_id,code,amount_vnd,points,status,created_at")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.user_id !== userId) return null;
  return data as Topup;
}

/** Đơn nạp gần đây của user (đơn chờ chuyển khoản / chờ duyệt lên đầu để mở lại mã QR). */
export async function getMyTopups(userId: string, limit = 5): Promise<Topup[]> {
  const { data } = await createStoreAdminClient()
    .from("point_topups")
    .select("id,user_id,code,amount_vnd,points,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Topup[];
}

/** Danh sách đơn nạp chờ duyệt (admin). */
export async function adminListTopups(): Promise<(Topup & { email: string | null })[]> {
  const supabase = createStoreAdminClient();
  // Đơn chờ duyệt lấy ĐỦ (trước đây chỉ 100 dòng mới nhất mọi trạng thái → đơn chờ cũ trôi khỏi hàng đợi,
  // khách đã chuyển tiền mà không được cộng) + 100 đơn đã xử lý gần nhất.
  const cols = "id,user_id,code,amount_vnd,points,status,created_at";
  const [{ data: pending }, { data: done }] = await Promise.all([
    supabase.from("point_topups").select(cols).eq("status", "pending").order("created_at", { ascending: true }),
    supabase.from("point_topups").select(cols).neq("status", "pending").order("created_at", { ascending: false }).limit(100),
  ]);
  const rows = [...(pending ?? []), ...(done ?? [])] as Topup[];

  const ids = [...new Set(rows.map((r) => r.user_id))];
  const emailMap = new Map<string, string | null>();
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id,email")
      .in("id", ids);
    for (const p of profs ?? []) emailMap.set(p.id, p.email);
  }

  return rows.map((r) => ({ ...r, email: emailMap.get(r.user_id) ?? null }));
}
