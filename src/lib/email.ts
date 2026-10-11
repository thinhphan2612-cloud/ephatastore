import "server-only";

/**
 * Gửi email qua Resend (domain gửi mail.ephatastore.com đã xác minh, DNS trên Vercel).
 * Env: RESEND_API_KEY (bắt buộc), EMAIL_FROM (mặc định "Ephata Store <no-reply@mail.ephatastore.com>").
 * Gọi REST API trực tiếp — không cần thêm thư viện.
 */
export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Chưa cấu hình RESEND_API_KEY" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Ephata Store <no-reply@mail.ephatastore.com>",
        to: input.to,
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!res.ok || !body?.id) return { ok: false, error: body?.message ?? `Resend ${res.status}` };
    return { ok: true, id: body.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Không gửi được email" };
  }
}
