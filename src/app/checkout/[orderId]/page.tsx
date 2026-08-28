import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrderForUser } from "@/data/store-user";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Thanh toán" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/checkout/${orderId}`);

  const order = await getOrderForUser(orderId, user.id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">Thanh toán</h1>
      <p className="mt-1 text-sm text-text-faint">Đơn #{order.id.slice(0, 8)}</p>

      <div className="mt-6 rounded-xl border border-border bg-surface p-5">
        <ul className="divide-y divide-border">
          {order.items.map((it, i) => (
            <li key={i} className="flex items-center justify-between py-3">
              <Link href={`/product/${it.slug}`} className="hover:text-accent">
                {it.title}
              </Link>
              <span>{formatPrice(it.unit_price_vnd)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 font-semibold">
          <span>Tổng</span>
          <span className="text-lg">{formatPrice(order.total_vnd)}</span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-accent/40 bg-accent/10 p-5 text-center">
        <p className="font-medium text-accent">Cổng thanh toán PayOS đang được kết nối.</p>
        <p className="mt-1 text-sm text-text-muted">
          Đơn đã được tạo ở trạng thái <strong>chờ thanh toán</strong>. Khi PayOS sẵn
          sàng, bạn sẽ thanh toán VietQR tại đây và sản phẩm vào Thư viện tự động.
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/browse" className="text-sm text-text-muted hover:text-text">
          ← Tiếp tục mua sắm
        </Link>
        <Link href="/library" className="ml-auto text-sm text-brand hover:text-brand-hover">
          Thư viện của tôi →
        </Link>
      </div>
    </div>
  );
}
