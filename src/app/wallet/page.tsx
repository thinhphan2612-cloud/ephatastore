import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { getBalance, getLedger, getMyTopups } from "@/data/wallet";
import { safeNext } from "@/lib/safe-next";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { TopupForm } from "@/components/topup-form";
import { listMyConnections } from "@/data/apps";
import { disconnectApp } from "@/lib/actions/apps";

export const metadata = { title: "Ví Point" };

const KIND_LABEL: Record<string, string> = {
  topup: "Nạp point",
  spend: "Sử dụng",
  refund: "Hoàn point",
  adjust: "Điều chỉnh",
};

const TOPUP_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chờ chuyển khoản / chờ duyệt", cls: "text-accent" },
  paid: { label: "Đã cộng point", cls: "text-success" },
  rejected: { label: "Bị từ chối", cls: "text-danger" },
};

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ need?: string; back?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/wallet");
  const sp = await searchParams;

  const [balance, ledger, connections, topups] = await Promise.all([
    getBalance(user.id),
    getLedger(user.id),
    listMyConnections(user.id),
    getMyTopups(user.id),
  ]);
  // Đến từ trang mua khi thiếu point: ?need=<giá> &back=<trang mua>.
  const need = Math.max(0, Math.floor(Number(sp.need) || 0));
  const missing = Math.max(0, need - balance);
  const back = sp.back ? safeNext(sp.back, "") : "";
  // Gợi ý số tiền nạp: đủ phần còn thiếu, làm tròn lên 10.000đ (tối thiểu 10.000đ).
  const suggestVnd = missing > 0 ? Math.max(10000, Math.ceil((missing * 100) / 10000) * 10000) : undefined;
  const walletApps = connections.filter((c) => c.product?.uses_wallet);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Ví Point</h1>

      <div className="mt-5 rounded-2xl border border-accent/30 bg-accent/5 p-6">
        <div className="text-sm text-text-muted">Số dư hiện tại</div>
        <div className="mt-1 text-4xl font-bold text-accent">
          {balance.toLocaleString("vi-VN")}{" "}
          <span className="text-lg font-semibold text-text-muted">point</span>
        </div>
        <div className="mt-1 text-xs text-text-faint">
          ≈ {formatPrice(balance * 100)} · 100đ = 1 point
        </div>
      </div>

      {need > 0 && (
        <div className={`mt-5 rounded-xl border p-4 text-sm ${missing > 0 ? "border-danger/40 bg-danger/10" : "border-success/40 bg-success/10"}`}>
          {missing > 0 ? (
            <p className="text-text">
              Cần <b>{need.toLocaleString("vi-VN")} point</b> để mua — bạn còn thiếu{" "}
              <b className="text-danger">{missing.toLocaleString("vi-VN")} point</b>. Nạp xong (sau khi admin duyệt) quay lại để mua tiếp.
            </p>
          ) : (
            <p className="text-success">Số dư đã đủ để mua.</p>
          )}
          {back && (
            <Link href={back} className="mt-2 inline-block font-semibold text-brand hover:text-brand-hover">
              ← Quay lại trang mua
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 font-semibold">Nạp point</h2>
        <TopupForm defaultAmount={suggestVnd} />
      </div>

      {topups.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-semibold">Đơn nạp gần đây</h2>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {topups.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">
                    <span className="font-mono">{t.code}</span> · {t.points.toLocaleString("vi-VN")} point
                    <span className="text-text-faint"> ({formatPrice(t.amount_vnd)})</span>
                  </div>
                  <div className="text-xs text-text-faint">
                    {formatDateTime(t.created_at)} ·{" "}
                    <span className={TOPUP_STATUS[t.status]?.cls}>{TOPUP_STATUS[t.status]?.label ?? t.status}</span>
                  </div>
                </div>
                {t.status === "pending" && (
                  <Link
                    href={`/wallet/topup/${t.id}`}
                    className="shrink-0 rounded-md border border-accent px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10"
                  >
                    Xem mã QR / thông tin CK
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {walletApps.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-1 font-semibold">Ứng dụng được trừ point</h2>
          <p className="mb-3 text-xs text-text-faint">
            Các ứng dụng bạn đã cho phép trừ point khi dùng dịch vụ. Ngắt kết nối thì ứng dụng không trừ được nữa.
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {walletApps.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">
                    {c.product?.icon ?? "✦"} {c.product?.title}
                  </div>
                  <div className="text-xs text-text-faint">
                    Kết nối {formatDate(c.created_at)}
                    {c.last_used_at && ` · dùng gần nhất ${formatDate(c.last_used_at)}`}
                  </div>
                </div>
                <form action={disconnectApp}>
                  <input type="hidden" name="connection_id" value={c.id} />
                  <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:border-danger hover:text-danger">
                    Ngắt kết nối
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-3 font-semibold">Lịch sử giao dịch</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-text-faint">Chưa có giao dịch nào.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {ledger.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">
                    {KIND_LABEL[e.kind] ?? e.kind}
                    {e.appTitle && <span className="text-text-muted"> · {e.appTitle}</span>}
                  </div>
                  {e.note && <div className="text-xs text-text-faint">{e.note}</div>}
                  <div className="text-xs text-text-faint">
                    {formatDateTime(e.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={e.amount >= 0 ? "font-semibold text-success" : "font-semibold text-danger"}>
                    {e.amount >= 0 ? "+" : ""}
                    {e.amount.toLocaleString("vi-VN")}
                  </div>
                  <div className="text-xs text-text-faint">
                    còn {e.balance_after.toLocaleString("vi-VN")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
