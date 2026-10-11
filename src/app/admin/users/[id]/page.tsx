import Link from "next/link";
import { adminGetUserItems, adminGetUserEmail, adminGetUserParishItems } from "@/data/admin-orders";
import { adminListProducts } from "@/data/admin";
import { formatDate } from "@/lib/format";
import { grantEntitlement, revokeEntitlement } from "@/lib/actions/admin";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const [email, items, products, parish] = await Promise.all([
    adminGetUserEmail(id),
    adminGetUserItems(id),
    adminListProducts(),
    adminGetUserParishItems(id),
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
