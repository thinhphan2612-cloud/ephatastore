import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBalance, getLedger } from "@/data/wallet";
import { formatPrice } from "@/lib/format";
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

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/wallet");

  const [balance, ledger, connections] = await Promise.all([
    getBalance(user.id),
    getLedger(user.id),
    listMyConnections(user.id),
  ]);
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

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 font-semibold">Nạp point</h2>
        <TopupForm />
      </div>

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
                    Kết nối {new Date(c.created_at).toLocaleDateString("vi-VN")}
                    {c.last_used_at && ` · dùng gần nhất ${new Date(c.last_used_at).toLocaleDateString("vi-VN")}`}
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
                    {new Date(e.created_at).toLocaleString("vi-VN")}
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
