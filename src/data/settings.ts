import "server-only";
import { cache } from "react";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

export interface StoreSettings {
  fullToppingPrice: number;
  freedomDays: number;
}

const DEFAULTS: StoreSettings = { fullToppingPrice: 200000, freedomDays: 30 };

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
