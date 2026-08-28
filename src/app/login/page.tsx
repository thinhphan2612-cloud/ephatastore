export const metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Đăng nhập</h1>
      <p className="mt-3 text-text-muted">
        Đăng nhập sẽ dùng chung tài khoản với{" "}
        <span className="text-text">app.giaoly.com.vn</span> qua SSO.
      </p>
      <div className="mt-6 rounded-lg border border-border bg-surface p-6 text-sm text-text-muted">
        Luồng SSO cross-domain đang được xây dựng.
      </div>
    </div>
  );
}
