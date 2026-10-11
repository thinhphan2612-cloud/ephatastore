"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { sendEmail } from "@/lib/email";
import { contactNotificationEmail } from "@/lib/email-templates";
import { CONTACT_TOPICS } from "@/lib/contact-topics";

export interface ContactState {
  ok?: boolean;
  error?: string;
}


const MAX_PER_HOUR = 3;

/**
 * Form Liên hệ → lưu contact_messages → gửi email tới hộp thư hỗ trợ (CONTACT_EMAIL_TO, mặc định 126verse@gmail.com),
 * reply-to = email người gửi (bấm Trả lời là trả lời thẳng khách). Không gửi email tự động cho người gửi
 * (tránh bị lợi dụng để gửi thư tới địa chỉ bất kỳ). Chống spam: ô bẫy ẩn + tối đa 3 lần / giờ / IP hoặc email.
 */
export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Ô bẫy: người thật không thấy ô này; bot điền vào → giả vờ thành công, không lưu.
  if (String(formData.get("website") ?? "").trim()) return { ok: true };

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const topicRaw = String(formData.get("topic") ?? "");
  const topic = (CONTACT_TOPICS as readonly string[]).includes(topicRaw) ? topicRaw : "Khác";
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);

  if (!name) return { error: "Nhập họ tên." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email không hợp lệ." };
  if (message.length < 10) return { error: "Nội dung quá ngắn — mô tả rõ hơn giúp chúng tôi hỗ trợ nhanh." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const ipHash = crypto
    .createHash("sha256")
    .update(`contact:${ip}:${process.env.STORE_SUPABASE_SERVICE_ROLE_KEY ?? ""}`)
    .digest("hex");

  const supabase = createStoreAdminClient();
  const since = new Date(Date.now() - 3600_000).toISOString();
  const [{ count: byIp }, { count: byEmail }] = await Promise.all([
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gt("created_at", since),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("email", email).gt("created_at", since),
  ]);
  if ((byIp ?? 0) >= MAX_PER_HOUR || (byEmail ?? 0) >= MAX_PER_HOUR)
    return { error: "Bạn đã gửi nhiều lần trong một giờ. Vui lòng đợi rồi gửi lại." };

  const user = await getCurrentUser();
  const { data: row, error } = await supabase
    .from("contact_messages")
    .insert({ name, email, topic, message, store_user_id: user?.id ?? null, ip_hash: ipHash })
    .select("id")
    .single();
  if (error) return { error: "Không lưu được tin nhắn. Thử lại sau ít phút." };

  const mail = contactNotificationEmail({
    id: row.id,
    name,
    email,
    topic,
    message,
    account: user ? { email: user.email, id: user.id } : null,
  });
  const sent = await sendEmail({ to: process.env.CONTACT_EMAIL_TO || "126verse@gmail.com", replyTo: email, ...mail });
  if (sent.ok) await supabase.from("contact_messages").update({ email_sent: true }).eq("id", row.id);
  else console.error("contact email", sent.error);

  // Tin đã lưu dù email lỗi → admin vẫn xem được ở Admin → Liên hệ.
  return { ok: true };
}
