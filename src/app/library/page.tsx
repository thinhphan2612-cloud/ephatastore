export const metadata = { title: "Thư viện" };

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Thư viện của tôi</h1>
      <p className="mt-3 text-text-muted">
        Nơi hiển thị các sản phẩm bạn đã sở hữu sau khi mua.
      </p>
      <div className="mt-6 rounded-lg border border-border bg-surface p-6 text-sm text-text-muted">
        Cần đăng nhập. Danh sách sở hữu (entitlements) sẽ nối sau khi có SSO và thanh toán.
      </div>
    </div>
  );
}
