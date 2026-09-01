import "server-only";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

export interface LedgerEntry {
  id: string;
  amount: number;
  balance_after: number;
  kind: string;
  note: string | null;
  created_at: string;
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
    .select("id,amount,balance_after,kind,note,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as LedgerEntry[];
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

/** Danh sách đơn nạp chờ duyệt (admin). */
export async function adminListTopups(): Promise<(Topup & { email: string | null })[]> {
  const supabase = createStoreAdminClient();
  const { data } = await supabase
    .from("point_topups")
    .select("id,user_id,code,amount_vnd,points,status,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as Topup[];

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
