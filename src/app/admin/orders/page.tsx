import { adminListOrders } from "@/data/admin-orders";
import { formatPrice, formatDate } from "@/lib/format";
import { approveOrder, cancelOrder } from "@/lib/actions/admin";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chờ thanh toán", cls: "bg-warn/15 text-warn" },
  paid: { label: "Đã thanh toán", cls: "bg-success/15 text-success" },
  cancelled: { label: "Đã huỷ", cls: "bg-text-faint/15 text-text-faint" },
  failed: { label: "Thất bại", cls: "bg-danger/15 text-danger" },
  refunded: { label: "Đã hoàn", cls: "bg-brand/15 text-brand" },
};

export default async function AdminOrdersPage() {
  const orders = await adminListOrders();
  const pending = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Đơn hàng <span className="text-text-faint">({orders.length})</span>
        {pending > 0 && (
          <span className="ml-2 rounded bg-warn/15 px-2 py-0.5 text-sm font-medium text-warn">
            {pending} chờ duyệt
          </span>
        )}
      </h2>

      <div className="space-y-3">
        {orders.map((o) => {
          const st = STATUS[o.status] ?? { label: o.status, cls: "bg-surface text-text-muted" };
          return (
            <div key={o.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold">{o.order_code ?? o.id.slice(0, 8)}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
                <span className="text-xs text-text-faint">{formatDate(o.created_at)}</span>
              </div>

              <div className="mt-2 text-sm text-text-muted">
                {o.email ?? "—"} ·{" "}
                {o.items.map((it) => it.title).join(", ")}
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  {o.discount_vnd > 0 && (
                    <span className="mr-2 text-text-faint">
                      {formatPrice(o.subtotal_vnd ?? 0)} − {formatPrice(o.discount_vnd)} ({o.discount_code})
                    </span>
                  )}
                  <span className="font-semibold">{formatPrice(o.total_vnd)}</span>
                </div>

                {o.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <form action={approveOrder}>
                      <input type="hidden" name="id" value={o.id} />
                      <ConfirmSubmit
                        confirm={`Duyệt đơn ${o.order_code}? Sản phẩm sẽ được cấp cho ${o.email}.`}
                        className="rounded-md bg-success px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
                      >
                        ✓ Duyệt (đã nhận CK)
                      </ConfirmSubmit>
                    </form>
                    <form action={cancelOrder}>
                      <input type="hidden" name="id" value={o.id} />
                      <ConfirmSubmit
                        confirm={`Huỷ đơn ${o.order_code}?`}
                        className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:border-danger/50 hover:text-danger"
                      >
                        Huỷ
                      </ConfirmSubmit>
                    </form>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <p className="py-10 text-center text-text-muted">Chưa có đơn hàng nào.</p>
        )}
      </div>
    </div>
  );
}
