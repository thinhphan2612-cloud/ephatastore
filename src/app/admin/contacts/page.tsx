import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Tin liên hệ" };

interface Row {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  store_user_id: string | null;
  email_sent: boolean;
  created_at: string;
}

/** Tin nhắn từ form /lien-he — đọc ở đây khi email tới hộp thư hỗ trợ bị lỗi / thất lạc. */
export default async function AdminContactsPage() {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .select("id,name,email,topic,message,store_user_id,email_sent,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Tin liên hệ</h2>
        <p className="text-sm text-text-muted">
          100 tin gần nhất từ form Liên hệ. Mỗi tin đã được gửi tới hộp thư hỗ trợ (cột Email) — trả lời ngay trong hộp thư.
        </p>
      </div>

      {error && <p className="text-sm text-danger">Không đọc được tin liên hệ: {error.message}</p>}

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-bg-elevated p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
              <div className="min-w-0">
                <b>{r.name}</b> <span className="select-all text-text-muted">&lt;{r.email}&gt;</span>
                {r.store_user_id && <span className="ml-2 text-xs text-text-faint">(đã đăng nhập)</span>}
              </div>
              <div className="flex items-center gap-3 text-xs text-text-faint tabular-nums">
                <span className="rounded-full border border-border px-2 py-0.5 text-text-muted">{r.topic}</span>
                <span className={r.email_sent ? "text-success" : "text-danger"}>
                  {r.email_sent ? "✓ đã gửi email" : "✕ email lỗi"}
                </span>
                <span>{formatDateTime(r.created_at)}</span>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-text">{r.message}</p>
          </div>
        ))}
        {!rows.length && !error && <p className="py-6 text-center text-sm text-text-faint">Chưa có tin nào.</p>}
      </div>
    </div>
  );
}
