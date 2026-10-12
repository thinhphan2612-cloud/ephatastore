import Link from "next/link";
import { adminGetUserItems, adminGetUserEmail, adminGetUserParishItems, adminGetUserWallet } from "@/data/admin-orders";
import { adminListProducts } from "@/data/admin";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { grantEntitlement, revokeEntitlement, adjustUserPoints, refundSpend } from "@/lib/actions/admin";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";

const field =
  "rounded-md border border-border bg-bg-elevated px-2.5 py-1.5 text-sm text-text focus:border-accent focus:outline-none";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const [email, items, products, parish, wallet] = await Promise.all([
    adminGetUserEmail(id),
    adminGetUserItems(id),
    adminListProducts(),
    adminGetUserParishItems(id),
    adminGetUserWallet(id),
  ]);

  const ownedIds = new Set([...items.map((i) => i.product_id), ...parish.items.filter((i) => i.active).map((i) => i.product_id)]);
  const grantable = products.filter((p) => !ownedIds.has(p.id));

  return (
    <div className="space-y-6">
      <div className="text-sm text-text-faint">
        <Link href="/admin/users" className="hover:text-text">
          Người dùng
        </Link>{" "}
        / {email ?? id.slice(0, 8)}
      </div>

      {notice && <p className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">{notice.slice(0, 200)}</p>}

      <h2 className="text-lg font-semibold">Sản phẩm sở hữu ({items.length})</h2>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Sản phẩm</th>
              <th className="px-3 py-2 font-medium">Cấp lúc</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.product_id} className="border-t border-border">
                <td className="px-3 py-2">
                  <Link href={`/product/${it.slug}`} className="text-text hover:text-accent">
                    {it.title}
                  </Link>
                </td>
                <td className="px-3 py-2 text-text-faint">{formatDate(it.granted_at)}</td>
                <td className="px-3 py-2">
                  <form action={revokeEntitlement}>
                    <input type="hidden" name="user_id" value={id} />
                    <input type="hidden" name="product_id" value={it.product_id} />
                    <ConfirmSubmit
                      confirm={`Thu hồi "${it.title}" khỏi user này?`}
                      className="text-danger hover:underline"
                    >
                      Thu hồi
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-text-muted">
                  Chưa sở hữu sản phẩm nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {parish.parishId && (
        <div>
          <h2 className="text-lg font-semibold">Tính năng Giáo Lý Số của giáo xứ ({parish.items.length})</h2>
          <p className="mb-2 text-xs text-text-faint">
            Quyền theo giáo xứ — mọi quản trị của giáo xứ dùng chung. Thu hồi ở đây là thu hồi của cả giáo xứ và gửi lệnh tắt sang Giáo Lý Số.
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {parish.items.map((it) => (
              <li key={it.product_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span>
                  <Link href={`/product/${it.slug}`} className="text-text hover:text-accent">
                    {it.title}
                  </Link>{" "}
                  <span className="text-xs text-text-faint">
                    · {it.source} · {it.active ? (it.expires_at ? `đến ${formatDate(it.expires_at)}` : "vĩnh viễn") : "đã hết / thu hồi"}
                  </span>
                </span>
                {it.active && (
                  <form action={revokeEntitlement}>
                    <input type="hidden" name="user_id" value={id} />
                    <input type="hidden" name="product_id" value={it.product_id} />
                    <input type="hidden" name="parish_id" value={parish.parishId!} />
                    <ConfirmSubmit confirm={`Thu hồi "${it.title}" của cả giáo xứ?`} className="text-danger hover:underline">
                      Thu hồi
                    </ConfirmSubmit>
                  </form>
                )}
              </li>
            ))}
            {parish.items.length === 0 && <li className="px-3 py-4 text-center text-text-muted">Giáo xứ chưa có tính năng nào.</li>}
          </ul>
        </div>
      )}

      {/* ---- Ví & hỗ trợ khách ---- */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Ví point · <span className="text-accent">{wallet.balance.toLocaleString("vi-VN")} point</span>
        </h2>
        <form action={adjustUserPoints} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3 text-sm">
          <input type="hidden" name="user_id" value={id} />
          <span className="font-medium">Điều chỉnh point</span>
          <input name="amount" type="number" required placeholder="+500 hoặc -200" className={`${field} w-36`} />
          <input name="reason" required minLength={5} maxLength={200} placeholder="Lý do (khách thấy trong lịch sử Ví)" className={`${field} min-w-0 flex-1`} />
          <ConfirmSubmit confirm="Điều chỉnh point của khách này? Thao tác được ghi nhật ký." className="rounded-md bg-accent px-3 py-2 font-semibold text-accent-contrast hover:bg-accent-hover">
            Thực hiện
          </ConfirmSubmit>
        </form>
        <p className="text-xs text-text-faint">
          Dùng khi chuyển khoản không khớp đơn, bù lỗi hệ thống… Hoàn một lượt mua thì dùng nút <b>Hoàn</b> ở bảng dưới (mỗi lượt hoàn 1 lần).
          Lượt trừ của app qua Ví do app tự hoàn.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Thời điểm</th>
                <th className="px-3 py-2 font-medium">Point</th>
                <th className="px-3 py-2 font-medium">Nội dung</th>
                <th className="px-3 py-2 font-medium">Hoàn</th>
              </tr>
            </thead>
            <tbody>
              {wallet.ledger.map((l) => (
                <tr key={l.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-text-muted">{formatDateTime(l.created_at)}</td>
                  <td className={`whitespace-nowrap px-3 py-2 tabular-nums font-semibold ${l.amount > 0 ? "text-success" : "text-text"}`}>
                    {l.amount > 0 ? "+" : ""}
                    {l.amount.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-text">{l.label ?? l.note ?? l.kind}</span>
                    <span className="block text-xs text-text-faint">
                      {l.kind}
                      {l.label && l.note ? ` · ${l.note}` : ""}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {l.refunded_at ? (
                      <span className="text-xs text-text-faint">Đã hoàn {formatDate(l.refunded_at)}</span>
                    ) : l.refundable ? (
                      <form action={refundSpend} className="flex flex-wrap items-center gap-1.5">
                        <input type="hidden" name="user_id" value={id} />
                        <input type="hidden" name="ledger_id" value={l.id} />
                        <input name="reason" required minLength={5} maxLength={200} placeholder="Lý do hoàn" className={`${field} w-40 py-1 text-xs`} />
                        <label className="flex items-center gap-1 text-xs text-text-muted" title="Tắt quyền dùng sản phẩm này của khách (toàn bộ, không chỉ phần của lượt này)">
                          <input type="checkbox" name="revoke" className="h-3.5 w-3.5" />
                          Thu hồi quyền dùng
                        </label>
                        <ConfirmSubmit
                          confirm={`Hoàn ${(-l.amount).toLocaleString("vi-VN")} point cho lượt này? Mỗi lượt chỉ hoàn được 1 lần.`}
                          className="rounded border border-border px-2 py-0.5 text-xs text-text hover:border-accent"
                        >
                          Hoàn
                        </ConfirmSubmit>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
              {wallet.ledger.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-text-muted">
                    Chưa có giao dịch nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {wallet.topups.length > 0 && (
          <div className="text-sm">
            <div className="mb-1 font-medium">Đơn nạp gần đây</div>
            <ul className="space-y-0.5 text-text-muted">
              {wallet.topups.map((t) => (
                <li key={t.id}>
                  <span className="font-mono text-text">{t.code}</span> · {formatPrice(t.amount_vnd)} · {t.status} ·{" "}
                  {formatDateTime(t.created_at)}
                  {t.reject_reason ? ` · ${t.reject_reason}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold">Cấp sản phẩm thủ công</h3>
        <form action={grantEntitlement} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="user_id" value={id} />
          <select
            name="product_id"
            required
            defaultValue=""
            className="flex-1 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          >
            <option value="" disabled>
              — Chọn sản phẩm —
            </option>
            {grantable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast hover:bg-accent-hover"
          >
            Cấp
          </button>
        </form>
      </div>
    </div>
  );
}
