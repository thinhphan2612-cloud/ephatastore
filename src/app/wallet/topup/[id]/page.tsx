import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { getTopupForUser } from "@/data/wallet";
import { formatPrice } from "@/lib/format";
import { BANK } from "@/lib/bank";
import { buildVietQrPayload } from "@/lib/vietqr";

export const metadata = { title: "Nạp point" };

export default async function TopupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/wallet/topup/${id}`);

  const topup = await getTopupForUser(id, user.id);
  if (!topup) notFound();

  const paid = topup.status === "paid";
  const rejected = topup.status === "rejected";

  const qrPayload = buildVietQrPayload({
    bin: BANK.bin,
    accountNumber: BANK.accountNumber,
    amount: topup.amount_vnd,
    addInfo: topup.code,
  });
  const qrSvg = await QRCode.toString(qrPayload, {
    type: "svg",
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">Nạp point</h1>
      <p className="mt-1 text-sm text-text-faint">
        Mã nạp <span className="font-mono text-text">{topup.code}</span> ·{" "}
        <strong className="text-accent">{topup.points.toLocaleString("vi-VN")} point</strong>
      </p>

      {paid ? (
        <div className="mt-5 rounded-xl border border-success/40 bg-success/10 p-5 text-center">
          <p className="font-medium text-success">
            Đã nhận thanh toán. {topup.points.toLocaleString("vi-VN")} point đã vào ví.
          </p>
          <Link href="/wallet" className="mt-2 inline-block text-sm text-accent hover:text-accent-hover">
            Về Ví →
          </Link>
        </div>
      ) : rejected ? (
        <div className="mt-5 rounded-xl border border-danger/40 bg-danger/10 p-5 text-center">
          <p className="font-medium text-danger">Đơn nạp đã bị từ chối.</p>
          <Link href="/wallet" className="mt-2 inline-block text-sm text-accent hover:text-accent-hover">
            Tạo lại →
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
            <Row label="Số tiền" value={formatPrice(topup.amount_vnd)} strong />
            <Row label="Nội dung CK" value={topup.code} mono strong />
          </dl>

          <p className="mt-4 rounded-md bg-bg-elevated p-3 text-xs text-text-muted">
            Chuyển khoản <strong>đúng số tiền</strong> và <strong>đúng nội dung</strong>{" "}
            <span className="font-mono">{topup.code}</span>. Point sẽ vào ví sau khi admin
            xác nhận nhận được chuyển khoản.
          </p>
        </div>
      )}

      <div className="mt-6 text-sm">
        <Link href="/wallet" className="text-text-muted hover:text-text">
          ← Về Ví
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
      <dd className={`text-right ${mono ? "font-mono" : ""} ${strong ? "font-semibold text-text" : "text-text"}`}>
        {value}
      </dd>
    </div>
  );
}
