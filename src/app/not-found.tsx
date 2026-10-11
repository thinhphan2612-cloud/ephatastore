import Link from "next/link";

export const metadata = { title: "Không tìm thấy trang" };

/** 404 chung: sản phẩm / trang không tồn tại hoặc đã ẩn. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="font-display text-5xl font-bold text-accent">404</div>
      <h1 className="mt-4 text-2xl font-bold">Không tìm thấy trang</h1>
      <p className="mt-2 text-text-muted">Trang hoặc sản phẩm này không tồn tại, đã đổi địa chỉ hoặc đã ẩn.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover">
          Về trang chủ
        </Link>
        <Link href="/library" className="rounded-xl border border-border px-5 py-2.5 font-semibold text-text hover:border-accent">
          Thư viện của tôi
        </Link>
      </div>
      <p className="mt-6 text-sm text-text-faint">
        Cần hỗ trợ?{" "}
        <Link href="/lien-he" className="text-accent hover:text-accent-hover">
          Liên hệ
        </Link>
      </p>
    </div>
  );
}
