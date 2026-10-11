import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBalance, getLedger } from "@/data/wallet";
import { formatPrice } from "@/lib/format";
import { TopupForm } from "@/components/topup-form";

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

  const [balance, ledger] = await Promise.all([
    getBalance(user.id),
    getLedger(user.id),
  ]);

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

      <div className="mt-6">
        <h2 className="mb-3 font-semibold">Lịch sử giao dịch</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-text-faint">Chưa có giao dịch nào.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {ledger.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{KIND_LABEL[e.kind] ?? e.kind}</div>
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
