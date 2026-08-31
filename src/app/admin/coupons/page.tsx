import { adminListCoupons } from "@/data/admin";
import { createCoupon, toggleCoupon, deleteCoupon } from "@/lib/actions/admin";
import { formatPrice } from "@/lib/format";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";

const input =
  "rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text focus:border-accent focus:outline-none";

export default async function AdminCouponsPage() {
  const coupons = await adminListCoupons();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Mã giảm giá ({coupons.length})</h2>

      {/* tạo mới */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold">Tạo coupon</h3>
        <form action={createCoupon} className="flex flex-wrap items-center gap-2">
          <input name="code" placeholder="MÃ (vd GIAM10)" required className={`${input} uppercase`} />
          <select name="kind" defaultValue="percent" className={input}>
            <option value="percent">Giảm %</option>
            <option value="amount">Giảm số tiền</option>
          </select>
          <input name="value" type="number" min={1} placeholder="Giá trị" required className={`${input} w-28`} />
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast hover:bg-accent-hover"
          >
            Tạo
          </button>
        </form>
      </div>

      {/* danh sách */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Mã</th>
              <th className="px-3 py-2 font-medium">Giảm</th>
              <th className="px-3 py-2 font-medium">Đã dùng</th>
              <th className="px-3 py-2 font-medium">Trạng thái</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono font-semibold">{c.code}</td>
                <td className="px-3 py-2 text-text-muted">
                  {c.kind === "percent" ? `${c.value}%` : formatPrice(c.value)}
                </td>
                <td className="px-3 py-2 text-text-muted">{c.used_count}</td>
                <td className="px-3 py-2">
                  <form action={toggleCoupon}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="next" value={String(!c.active)} />
                    <button
                      type="submit"
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        c.active ? "bg-success/15 text-success" : "bg-text-faint/15 text-text-faint"
                      }`}
                    >
                      {c.active ? "Đang bật" : "Tắt"}
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2">
                  <form action={deleteCoupon}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmSubmit confirm={`Xoá mã ${c.code}?`} className="text-danger hover:underline">
                      Xoá
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-text-muted">
                  Chưa có mã giảm giá.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
