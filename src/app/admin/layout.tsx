import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";

export const metadata = { title: "Admin" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) redirect("/");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Quản trị</h1>
          <Link href="/admin" className="text-sm text-brand hover:text-brand-hover">
            Sản phẩm
          </Link>
        </div>
        <span className="text-sm text-text-faint">{user.email}</span>
      </div>
      {children}
    </div>
  );
}
