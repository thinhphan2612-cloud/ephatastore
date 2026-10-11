import { adminListTopups } from "@/data/wallet";
import { formatPrice, formatDate } from "@/lib/format";
import { approveTopup, rejectTopup } from "@/lib/actions/wallet";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chờ chuyển khoản", cls: "bg-warn/15 text-warn" },
  paid: { label: "Đã cộng point", cls: "bg-success/15 text-success" },
  rejected: { label: "Đã từ chối", cls: "bg-danger/15 text-danger" },
};

export default async function AdminTopupsPage() {
  const topups = await adminListTopups();
  const pending = topups.filter((t) => t.status === "pending").length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Nạp point <span className="text-text-faint">({topups.length})</span>
        {pending > 0 && (
          <span className="ml-2 rounded bg-warn/15 px-2 py-0.5 text-sm font-medium text-warn">
            {pending} chờ duyệt
          </span>
        )}
      </h2>

      <div className="space-y-3">
        {topups.map((t) => {
          const st = STATUS[t.status] ?? { label: t.status, cls: "bg-surface text-text-muted" };
          return (
            <div key={t.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold">{t.code}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
                <span className="text-xs text-text-faint">{formatDate(t.created_at)}</span>
              </div>

              <div className="mt-2 text-sm text-text-muted">{t.email ?? "—"}</div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <span className="font-semibold">{formatPrice(t.amount_vnd)}</span>
                  <span className="ml-2 text-accent">
                    +{t.points.toLocaleString("vi-VN")} point
                  </span>
                </div>

                {t.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <form action={approveTopup}>
                      <input type="hidden" name="id" value={t.id} />
                      <ConfirmSubmit
                        confirm={`Duyệt nạp ${t.code}? Cộng ${t.points.toLocaleString("vi-VN")} point cho ${t.email}.`}
                        className="rounded-md bg-success px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
                      >
                        ✓ Duyệt (đã nhận CK)
                      </ConfirmSubmit>
                    </form>
                    <form action={rejectTopup}>
                      <input type="hidden" name="id" value={t.id} />
                      <ConfirmSubmit
                        confirm={`Từ chối đơn nạp ${t.code}?`}
                        className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:border-danger/50 hover:text-danger"
                      >
                        Từ chối
                      </ConfirmSubmit>
                    </form>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {topups.length === 0 && (
          <p className="py-10 text-center text-text-muted">Chưa có đơn nạp nào.</p>
        )}
      </div>
    </div>
  );
}
