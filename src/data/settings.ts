import "server-only";
import { cache } from "react";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

/** Chính sách giá chung (bảng store_settings). Dòng access_mode cũ trong DB không còn dùng. */
export interface StoreSettings {
  /** Giá Full Topping / tháng (VND) — khách trả 12 tháng / lần. */
  fullToppingPrice: number;
  /** Số ngày của gói mua lẻ (giá bằng 1 tháng). */
  freedomDays: number;
}

const DEFAULTS: StoreSettings = {
  fullToppingPrice: 200000,
  freedomDays: 30,
};

export const getSettings = cache(async (): Promise<StoreSettings> => {
  try {
    const supabase = createStoreAdminClient();
    const { data } = await supabase.from("store_settings").select("key,value");
    const map = new Map((data ?? []).map((r) => [r.key, r.value]));
    return {
      fullToppingPrice: Number(map.get("full_topping_price")) || DEFAULTS.fullToppingPrice,
      freedomDays: Number(map.get("freedom_days")) || DEFAULTS.freedomDays,
    };
  } catch {
    return DEFAULTS;
  }
});
