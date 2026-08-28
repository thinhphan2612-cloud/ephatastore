"use server";

import { redirect } from "next/navigation";
import { createStoreAuthServerClient } from "@/lib/supabase/store-auth-server";

export async function signOut() {
  const supabase = await createStoreAuthServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
