import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { getOrderForUser } from "@/data/store-user";
import { formatPrice } from "@/lib/format";
import { BANK } from "@/lib/bank";
import { buildVietQrPayload } from "@/lib/vietqr";
import { DiscountForm } from "@/components/discount-form";
import { removeDiscount } from "@/lib/actions/checkout";

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

  const paid = order.status === "paid";
  const orderCode = order.order_code ?? order.id.slice(0, 8).toUpperCase();

  const qrPayload = buildVietQrPayload({
    bin: BANK.bin,
    accountNumber: BANK.accountNumber,
    amount: order.total_vnd,
    addInfo: orderCode,
  });
  const qrSvg = await QRCode.toString(qrPayload, {
    type: "svg",
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">Thanh toán</h1>
      <p className="mt-1 text-sm text-text-faint">
        Đơn <span className="font-mono text-text">{orderCode}</span>
      </p>

      {/* Tóm tắt đơn */}
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

        <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-text-muted">
            <dt>Tạm tính</dt>
            <dd>{formatPrice(order.subtotal_vnd)}</dd>
          </div>
          {order.discount_vnd > 0 && (
            <div className="flex justify-between text-success">
              <dt className="flex items-center gap-2">
                Giảm ({order.discount_code})
                {!paid && (
                  <form action={removeDiscount}>
                    <input type="hidden" name="order_id" value={order.id} />
                    <button type="submit" className="text-xs text-text-faint hover:text-danger">
                      (gỡ)
                    </button>
                  </form>
                )}
              </dt>
              <dd>−{formatPrice(order.discount_vnd)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <dt>Cần thanh toán</dt>
            <dd className="text-lg">{formatPrice(order.total_vnd)}</dd>
          </div>
        </dl>

        {!paid && order.discount_vnd === 0 && (
          <div className="mt-4">
            <DiscountForm orderId={order.id} />
          </div>
        )}
      </div>

      {paid ? (
        <div className="mt-5 rounded-xl border border-success/40 bg-success/10 p-5 text-center">
          <p className="font-medium text-success">Đã thanh toán. Sản phẩm đã vào Thư viện.</p>
          <Link href="/library" className="mt-2 inline-block text-sm text-brand hover:text-brand-hover">
            Mở Thư viện →
          </Link>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-center font-semibold">Quét mã VietQR để chuyển khoản</h2>

          <div className="mx-auto w-fit rounded-lg bg-white p-3">
            <div
              className="h-56 w-56"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>

          <dl className="mx-auto mt-5 max-w-sm space-y-2 text-sm">
            <Row label="Ngân hàng" value={BANK.bankName} />
            <Row label="Số tài khoản" value={BANK.accountNumber} mono />
            <Row label="Chủ tài khoản" value={BANK.accountName} />
            <Row label="Số tiền" value={formatPrice(order.total_vnd)} strong />
            <Row label="Nội dung CK" value={orderCode} mono strong />
          </dl>

          <p className="mt-4 rounded-md bg-bg-elevated p-3 text-xs text-text-muted">
            Chuyển khoản <strong>đúng số tiền</strong> và <strong>đúng nội dung</strong>{" "}
            <span className="font-mono">{orderCode}</span> để đối soát. Đơn sẽ được xác nhận
            sau khi nhận được chuyển khoản; sản phẩm vào Thư viện khi xác nhận.
          </p>
        </div>
      )}

      <div className="mt-6 flex gap-3 text-sm">
        <Link href="/browse" className="text-text-muted hover:text-text">
          ← Tiếp tục mua sắm
        </Link>
        <Link href="/library" className="ml-auto text-brand hover:text-brand-hover">
          Thư viện của tôi →
        </Link>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-faint">{label}</dt>
      <dd
        className={`text-right ${mono ? "font-mono" : ""} ${
          strong ? "font-semibold text-text" : "text-text"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
