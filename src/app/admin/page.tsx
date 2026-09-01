import Link from "next/link";
import { adminListProducts } from "@/data/admin";
import { updateProductConfig, deleteProduct } from "@/lib/actions/admin";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";

const input =
  "rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm text-text focus:border-accent focus:outline-none";

export default async function AdminProductsPage() {
  const products = await adminListProducts();
  const pro = products.filter((p) => p.tier === "pro").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Sản phẩm <span className="text-text-faint">({products.length})</span>{" "}
          <span className="text-sm text-text-muted">· {pro} PRO / {products.length - pro} FREE</span>
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products/new"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast hover:bg-accent-hover"
          >
            + Thêm sản phẩm
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Sản phẩm</th>
              <th className="px-3 py-2 font-medium">Cấu hình: Tier · Giá/tháng · Trial · Số ngày · Hiện</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border align-middle">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-accent">{p.icon ?? "✦"}</span>
                    <div>
                      <div className="font-medium text-text">{p.title}</div>
                      <div className="text-xs text-text-faint">{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <form action={updateProductConfig} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="id" value={p.id} />
                    <select name="tier" defaultValue={p.tier} className={input}>
                      <option value="free">FREE</option>
                      <option value="pro">PRO</option>
                    </select>
                    <input
                      type="number"
                      name="price_month"
                      min={0}
                      step={1000}
                      defaultValue={p.price_month}
                      className={`${input} w-24`}
                    />
                    <label className="flex items-center gap-1.5 text-xs text-text-muted">
                      <input type="checkbox" name="trial" defaultChecked={p.trial} className="h-4 w-4" />
                      Trial
                    </label>
                    <input
                      type="number"
                      name="trial_days"
                      min={1}
                      max={60}
                      defaultValue={p.trial_days}
                      className={`${input} w-16`}
                    />
                    <label className="flex items-center gap-1.5 text-xs text-text-muted">
                      <input type="checkbox" name="active" defaultChecked={p.active} className="h-4 w-4" />
                      Hiện
                    </label>
                    <button
                      type="submit"
                      className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-contrast hover:bg-accent-hover"
                    >
                      Lưu
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="text-brand hover:text-brand-hover"
                    >
                      Sửa
                    </Link>
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmSubmit
                        confirm={`Xóa "${p.title}"? Hành động này không hoàn tác được. File host (nếu có) cũng bị xóa.`}
                        className="text-text-faint hover:text-danger"
                      >
                        Xóa
                      </ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
