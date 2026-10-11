import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { getTopupForUser } from "@/data/wallet";
import { formatPrice } from "@/lib/format";
import { BANK } from "@/lib/bank";
import { buildVietQrPayload } from "@/lib/vietqr";
import { CopyButton } from "@/components/copy-button";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Nạp point" };

export default async function TopupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { id } = await params;
  // Đến từ trang mua (thiếu point): cộng point xong quay lại mua tiếp.
  const back = safeNext((await searchParams).back, "");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/wallet/topup/${id}`);

  const topup = await getTopupForUser(id, user.id);
  if (!topup) notFound();

  const paid = topup.status === "paid";
  const rejected = topup.status === "rejected";
  const contactHref = `/lien-he?chu-de=nap-point&ma=${encodeURIComponent(topup.code)}`;

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
          {back ? (
            <Link
              href={back}
              className="mt-3 inline-block rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover"
            >
              Quay lại mua tiếp →
            </Link>
          ) : (
            <Link href="/wallet" className="mt-2 inline-block text-sm text-accent hover:text-accent-hover">
              Về Ví →
            </Link>
          )}
        </div>
      ) : rejected ? (
        <div className="mt-5 rounded-xl border border-danger/40 bg-danger/10 p-5 text-center">
          <p className="font-medium text-danger">Đơn nạp chưa được duyệt.</p>
          {topup.reject_reason && <p className="mt-1 text-sm text-text">Lý do: {topup.reject_reason}</p>}
          <p className="mt-3 text-sm text-text-muted">
            Bạn <b className="text-text">đã chuyển khoản</b>?{" "}
            <Link href={contactHref} className="font-semibold text-accent hover:text-accent-hover">
              Gửi yêu cầu hỗ trợ kèm mã {topup.code}
            </Link>{" "}
            — chúng tôi kiểm tra và cộng point hoặc hoàn tiền.
          </p>
          <Link href="/wallet" className="mt-3 inline-block text-sm text-brand hover:text-brand-hover">
            Tạo đơn nạp mới →
          </Link>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-1 text-center font-semibold">Quét mã VietQR để chuyển khoản</h2>
          <p className="mb-4 text-center text-xs text-text-faint">
            Đang dùng điện thoại? Copy số tài khoản, số tiền và nội dung bên dưới rồi dán vào app ngân hàng.
          </p>

          <div className="mx-auto w-fit rounded-lg bg-white p-3">
            <div
              className="h-56 w-56"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>

          <dl className="mx-auto mt-5 max-w-sm space-y-2 text-sm">
            <Row label="Ngân hàng" value={BANK.bankName} />
            <Row label="Số tài khoản" value={BANK.accountNumber} mono copy={BANK.accountNumber} />
            <Row label="Chủ tài khoản" value={BANK.accountName} />
            <Row label="Số tiền" value={formatPrice(topup.amount_vnd)} strong copy={String(topup.amount_vnd)} />
            <Row label="Nội dung CK" value={topup.code} mono strong copy={topup.code} />
          </dl>

          <p className="mt-4 rounded-md bg-bg-elevated p-3 text-xs text-text-muted">
            Chuyển khoản <strong>đúng số tiền</strong> và <strong>đúng nội dung</strong>{" "}
            <span className="font-mono">{topup.code}</span>. Point vào ví sau khi admin xác nhận đã nhận tiền —
            thường trong giờ làm việc, chậm nhất 24 giờ làm việc. Bạn sẽ nhận email khi point được cộng.
          </p>
          {back && (
            <p className="mt-3 text-center text-sm text-text-muted">
              Point vào ví rồi?{" "}
              <Link href={back} className="font-semibold text-brand hover:text-brand-hover">
                Quay lại trang mua →
              </Link>
            </p>
          )}
          <p className="mt-3 text-center text-xs text-text-faint">
            Đã chuyển quá 24 giờ làm việc mà chưa được cộng?{" "}
            <Link href={contactHref} className="text-accent hover:text-accent-hover">
              Liên hệ kèm mã {topup.code}
            </Link>
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
  copy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
  /** Giá trị copy (vd số tiền chỉ gồm chữ số); không có thì không hiện nút. */
  copy?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-text-faint">{label}</dt>
      <dd className={`flex items-center gap-2 text-right ${mono ? "font-mono" : ""} ${strong ? "font-semibold text-text" : "text-text"}`}>
        {/* select-all: không copy được bằng nút (trình duyệt chặn clipboard) thì chạm là chọn cả giá trị để giữ-copy. */}
        <span className="select-all break-all">{value}</span>
        {copy && <CopyButton value={copy} />}
      </dd>
    </div>
  );
}
