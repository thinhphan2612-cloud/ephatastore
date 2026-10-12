import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export const metadata = { title: "Admin" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminUser(user)) redirect("/");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-xl font-bold">Quản trị</h1>
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Link href="/admin" className="text-brand hover:text-brand-hover">
              Sản phẩm
            </Link>
            <Link href="/admin/catalog" className="text-brand hover:text-brand-hover">
              Danh mục & NPH
            </Link>
            <Link href="/admin/topups" className="text-brand hover:text-brand-hover">
              Nạp point
            </Link>
            <Link href="/admin/coupons" className="text-brand hover:text-brand-hover">
              Coupon
            </Link>
            <Link href="/admin/users" className="text-brand hover:text-brand-hover">
              Người dùng
            </Link>
            <Link href="/admin/provisions" className="text-brand hover:text-brand-hover">
              Đồng bộ GLS
            </Link>
            <Link href="/admin/settings" className="text-brand hover:text-brand-hover">
              Cài đặt
            </Link>
            <Link href="/admin/audit" className="text-brand hover:text-brand-hover">
              Nhật ký
            </Link>
            <Link href="/admin/contacts" className="text-brand hover:text-brand-hover">
              Liên hệ
            </Link>
          </nav>
        </div>
        <span className="min-w-0 truncate text-sm text-text-faint">{user.email}</span>
      </div>
      {children}
    </div>
  );
}
