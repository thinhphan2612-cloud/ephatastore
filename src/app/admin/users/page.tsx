import Link from "next/link";
import { adminListUsers } from "@/data/admin-orders";
import { formatDate } from "@/lib/format";
import { normalizePlan } from "@/lib/plan";

export default async function AdminUsersPage() {
  const users = await adminListUsers();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Người dùng <span className="text-text-faint">({users.length})</span>
      </h2>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Giáo Lý Số</th>
              <th className="px-3 py-2 font-medium">Gói</th>
              <th className="px-3 py-2 font-medium">Sở hữu</th>
              <th className="px-3 py-2 font-medium">Ngày tạo</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium text-text">{u.email ?? "—"}</td>
                <td className="px-3 py-2">
                  {u.giaoly_linked ? (
                    <span className="text-success">✓ đã liên kết</span>
                  ) : (
                    <span className="text-text-faint">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-text-muted">
                  {u.giaoly_linked ? (normalizePlan(u.plan) === "pro" ? "Pro" : "Free") : "—"}
                </td>
                <td className="px-3 py-2 text-text-muted">{u.owned_count}</td>
                <td className="px-3 py-2 text-text-faint">{formatDate(u.created_at)}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-brand hover:text-brand-hover"
                  >
                    Xem
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="py-10 text-center text-text-muted">Chưa có người dùng.</p>
        )}
      </div>
    </div>
  );
}
