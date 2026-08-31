import "server-only";
import { cache } from "react";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

/** Chế độ truy cập: 'giaoly_pro' = gate bằng gói Pro giaoly (giai đoạn đầu);
 *  'store' = bán/thu tiền trên store (gói năm/Freedom/Topping/Trial). */
export type AccessMode = "giaoly_pro" | "store";

export interface StoreSettings {
  fullToppingPrice: number;
  freedomDays: number;
  accessMode: AccessMode;
}

const DEFAULTS: StoreSettings = {
  fullToppingPrice: 200000,
  freedomDays: 30,
  accessMode: "giaoly_pro",
};

export const getSettings = cache(async (): Promise<StoreSettings> => {
  try {
    const supabase = createStoreAdminClient();
    const { data } = await supabase.from("store_settings").select("key,value");
    const map = new Map((data ?? []).map((r) => [r.key, r.value]));
    return {
      fullToppingPrice: Number(map.get("full_topping_price")) || DEFAULTS.fullToppingPrice,
      freedomDays: Number(map.get("freedom_days")) || DEFAULTS.freedomDays,
      accessMode: map.get("access_mode") === "store" ? "store" : "giaoly_pro",
    };
  } catch {
    return DEFAULTS;
  }
});
