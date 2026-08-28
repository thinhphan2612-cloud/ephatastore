import Link from "next/link";
import { adminListProducts } from "@/data/admin";
import { formatPrice } from "@/lib/format";
import { deleteProduct, togglePublish } from "@/lib/actions/admin";
import { DeleteButton } from "@/components/admin/delete-button";

export default async function AdminProductsPage() {
  const products = await adminListProducts();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Sản phẩm <span className="text-text-faint">({products.length})</span>
        </h2>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast hover:bg-accent-hover"
        >
          + Thêm sản phẩm
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Tiêu đề</th>
              <th className="px-3 py-2 font-medium">Danh mục</th>
              <th className="px-3 py-2 font-medium">Giá</th>
              <th className="px-3 py-2 font-medium">Gói</th>
              <th className="px-3 py-2 font-medium">Trạng thái</th>
              <th className="px-3 py-2 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="font-medium text-text">{p.title}</div>
                  <div className="text-xs text-text-faint">{p.slug}</div>
                </td>
                <td className="px-3 py-2 text-text-muted">{p.category?.name ?? "—"}</td>
                <td className="px-3 py-2 text-text-muted">{formatPrice(p.price_vnd)}</td>
                <td className="px-3 py-2 text-text-muted">
                  {p.min_plan === "pro" ? "Pro" : p.min_plan === "free" ? "Free" : "—"}
                </td>
                <td className="px-3 py-2">
                  <form action={togglePublish}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="next" value={String(!p.published)} />
                    <button
                      type="submit"
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        p.published
                          ? "bg-success/15 text-success"
                          : "bg-text-faint/15 text-text-faint"
                      }`}
                      title="Bấm để đổi trạng thái"
                    >
                      {p.published ? "Đang bán" : "Ẩn"}
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
                      <DeleteButton title={p.title} />
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
