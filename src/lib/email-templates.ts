import "server-only";
import { COMPANY } from "@/lib/company";

/**
 * Template email theo theme trang chủ (nền tối, gold, tiêu đề Lora). Email client bỏ <style>/font không đều nhau
 * → mọi style viết inline, bố cục bằng <table>, font có fallback (Times New Roman / Arial). Ảnh dùng URL production
 * vì email mở ngoài site. Nội dung người dùng nhập luôn qua esc().
 */
const SITE = "https://www.ephatastore.com";

const C = {
  bg: "#07090b",
  card: "#0d1115",
  surface: "#12181d",
  border: "#232a30",
  text: "#f7f4ec",
  muted: "#9aa4ac",
  faint: "#6b737a",
  accent: "#e0bf65",
  accentContrast: "#14110a",
};
const SANS = "'Be Vietnam Pro',Arial,Helvetica,sans-serif";
// Không dùng Georgia: thiếu dấu tiếng Việt ("ắ" bị tách dấu) — Gmail chặn web font nên rơi về fallback.
const SERIF = "Lora,'Times New Roman',Times,serif";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Khung chung: logo, card nội dung, chân email có tên công ty. `preheader` = dòng xem trước trong hộp thư. */
function layout({ preheader, eyebrow, title, body }: { preheader: string; eyebrow: string; title: string; body: string }) {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&family=Lora:wght@700&display=swap" rel="stylesheet">
<title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
    <tr><td style="padding:0 4px 20px;">
      <a href="${SITE}" style="text-decoration:none;"><img src="${SITE}/logo.png" width="98" height="42" alt="Ephata Store" style="display:block;border:0;height:42px;width:auto;"></a>
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:20px;padding:32px 28px;font-family:${SANS};color:${C.text};">
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${C.accent};">${esc(eyebrow)}</div>
      <h1 style="margin:12px 0 0;font-family:${SERIF};font-size:26px;line-height:1.3;font-weight:700;color:${C.text};">${esc(title)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:20px 4px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.faint};">
      ${esc(COMPANY.store)} · vận hành bởi ${esc(COMPANY.name)}<br>
      <a href="${SITE}" style="color:${C.muted};text-decoration:none;">ephatastore.com</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr>
<td style="background:${C.accent};border-radius:12px;">
<a href="${esc(href)}" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:14px;font-weight:700;color:${C.accentContrast};text-decoration:none;">${esc(label)}</a>
</td></tr></table>`;
}

function infoRow(label: string, valueHtml: string) {
  return `<tr>
<td style="padding:8px 0;width:120px;vertical-align:top;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.faint};">${esc(label)}</td>
<td style="padding:8px 0;vertical-align:top;font-size:14px;color:${C.text};">${valueHtml}</td>
</tr>`;
}

/** Email báo tin Liên hệ mới cho hộp thư hỗ trợ. Bấm Trả lời (reply-to) hoặc nút → trả lời thẳng người gửi. */
export function contactNotificationEmail(m: {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  account: { email?: string | null; id: string } | null;
}) {
  const subject = `[Ephata Store] ${m.topic} — ${m.name}`;
  const accountLine = m.account ? `${m.account.email ?? ""} (${m.account.id})` : "Chưa đăng nhập";

  const text = [
    `Người gửi: ${m.name} <${m.email}>`,
    `Chủ đề: ${m.topic}`,
    `Tài khoản Ephata: ${accountLine}`,
    "",
    m.message,
    "",
    `— Mã tin nhắn: ${m.id}. Bấm Trả lời để trả lời trực tiếp người gửi.`,
    `Xem tất cả: ${SITE}/admin/contacts`,
  ].join("\n");

  const replyHref = `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${subject}`)}`;
  const body = `
<p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:${C.muted};">Có tin nhắn mới từ form Liên hệ trên ${esc(COMPANY.store)}.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;border-top:1px solid ${C.border};border-bottom:1px solid ${C.border};">
${infoRow("Người gửi", `<b>${esc(m.name)}</b><br><a href="mailto:${esc(m.email)}" style="color:${C.accent};text-decoration:none;">${esc(m.email)}</a>`)}
${infoRow("Chủ đề", `<span style="display:inline-block;padding:3px 10px;border:1px solid ${C.accent};border-radius:999px;font-size:12px;color:${C.accent};">${esc(m.topic)}</span>`)}
${infoRow("Tài khoản", m.account ? esc(accountLine) : `<span style="color:${C.muted};">Chưa đăng nhập</span>`)}
</table>
<div style="margin-top:22px;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${C.faint};">Nội dung</div>
<div style="margin-top:10px;padding:18px 20px;background:${C.surface};border-left:3px solid ${C.accent};border-radius:10px;font-size:15px;line-height:1.7;color:${C.text};white-space:pre-wrap;word-break:break-word;">${esc(m.message)}</div>
${button(replyHref, `Trả lời ${m.name}`)}
<p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:${C.faint};">
Bấm Trả lời trong hộp thư cũng gửi thẳng tới người gửi. Mã tin: ${esc(m.id)} ·
<a href="${SITE}/admin/contacts" style="color:${C.muted};">Xem trong Admin → Liên hệ</a>
</p>`;

  return {
    subject,
    text,
    html: layout({ preheader: `${m.name}: ${m.message.slice(0, 90)}`, eyebrow: `// Tin liên hệ · ${m.topic}`, title: "Tin nhắn mới từ khách", body }),
  };
}

/** Email cho khách: đơn nạp đã được duyệt, point đã vào ví. */
export function topupApprovedEmail(t: { code: string; points: number; amountVnd: number; balance: number | null }) {
  const pts = t.points.toLocaleString("vi-VN");
  const subject = `Đã cộng ${pts} point vào Ví Ephata Store (${t.code})`;
  const text = [
    `Đơn nạp ${t.code} (${t.amountVnd.toLocaleString("vi-VN")}đ) đã được xác nhận — ${pts} point đã vào ví của bạn.`,
    t.balance != null ? `Số dư hiện tại: ${t.balance.toLocaleString("vi-VN")} point.` : "",
    "",
    `Mở Ví: ${SITE}/wallet`,
  ].filter(Boolean).join("\n");
  const body = `
<p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#c9ced2;">Đơn nạp <b style="color:${C.text};">${esc(t.code)}</b> (${esc(t.amountVnd.toLocaleString("vi-VN"))}đ) đã được xác nhận.</p>
<div style="margin-top:22px;padding:20px;background:${C.surface};border-left:3px solid ${C.accent};border-radius:10px;">
  <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.faint};">Đã cộng vào ví</div>
  <div style="margin-top:6px;font-family:${SERIF};font-size:30px;font-weight:700;color:${C.accent};">+${esc(pts)} point</div>
  ${t.balance != null ? `<div style="margin-top:6px;font-size:13px;color:${C.muted};">Số dư hiện tại: ${esc(t.balance.toLocaleString("vi-VN"))} point</div>` : ""}
</div>
${button(`${SITE}/wallet`, "Mở Ví point →")}`;
  return { subject, text, html: layout({ preheader: `${pts} point đã vào ví của bạn.`, eyebrow: "// Ví point · Nạp thành công", title: "Point đã vào ví", body }) };
}

/** Email cho khách: đơn nạp bị từ chối — kèm lý do + đường liên hệ nếu đã chuyển khoản. */
export function topupRejectedEmail(t: { code: string; amountVnd: number; reason: string }) {
  const subject = `Đơn nạp ${t.code} chưa được duyệt — Ephata Store`;
  const contact = `${SITE}/lien-he?chu-de=nap-point&ma=${encodeURIComponent(t.code)}`;
  const text = [
    `Đơn nạp ${t.code} (${t.amountVnd.toLocaleString("vi-VN")}đ) chưa được duyệt.`,
    `Lý do: ${t.reason}`,
    "",
    `Nếu bạn ĐÃ chuyển khoản, gửi yêu cầu kèm mã ${t.code} tại: ${contact}`,
  ].join("\n");
  const body = `
<p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#c9ced2;">Đơn nạp <b style="color:${C.text};">${esc(t.code)}</b> (${esc(t.amountVnd.toLocaleString("vi-VN"))}đ) chưa được duyệt.</p>
<div style="margin-top:22px;padding:16px 18px;background:${C.surface};border-left:3px solid ${C.accent};border-radius:10px;font-size:14px;line-height:1.7;color:${C.text};">
  <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.faint};">Lý do</div>
  <div style="margin-top:6px;white-space:pre-wrap;">${esc(t.reason)}</div>
</div>
<p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:${C.muted};"><b style="color:${C.text};">Bạn đã chuyển khoản?</b> Gửi yêu cầu kèm mã ${esc(t.code)} — chúng tôi kiểm tra và cộng point hoặc hoàn tiền.</p>
${button(contact, "Gửi yêu cầu hỗ trợ →")}`;
  return { subject, text, html: layout({ preheader: `Lý do: ${t.reason.slice(0, 80)}`, eyebrow: "// Ví point · Đơn nạp", title: "Đơn nạp chưa được duyệt", body }) };
}
