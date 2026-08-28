"use server";

import { redirect } from "next/navigation";
import { createGiaolyServerClient } from "@/lib/supabase/giaoly-server";

export async function signOut() {
  const supabase = await createGiaolyServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
