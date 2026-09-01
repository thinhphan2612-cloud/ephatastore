import "server-only";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

export class InsufficientPointsError extends Error {
  constructor() {
    super("INSUFFICIENT_POINTS");
    this.name = "InsufficientPointsError";
  }
}

/**
 * Điều chỉnh point atomic (delta âm = trừ). Trả số dư mới.
 * Ném InsufficientPointsError nếu không đủ (số dư sẽ âm).
 */
export async function adjustPoints(
  userId: string,
  delta: number,
  kind: string,
  ref?: string,
  note?: string
): Promise<number> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase.rpc("adjust_points", {
    p_user: userId,
    p_amount: delta,
    p_kind: kind,
    p_ref: ref ?? null,
    p_note: note ?? null,
  });
  if (error) {
    if (/INSUFFICIENT_POINTS/.test(error.message)) throw new InsufficientPointsError();
    throw new Error(error.message);
  }
  return Number(data);
}
