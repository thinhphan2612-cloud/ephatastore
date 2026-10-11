import Link from "next/link";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

export const metadata = { title: "Nhật ký admin" };

const ACTION_LABEL: Record<string, string> = {
  "product.create": "Tạo sản phẩm",
  "product.update": "Sửa sản phẩm",
  "product.delete": "Xóa sản phẩm",
  "product.config": "Sửa cấu hình nhanh",
  "product.publish": "Ẩn / hiện sản phẩm",
  "entitlement.grant": "Cấp quyền",
  "entitlement.revoke": "Thu hồi quyền",
  "topup.approve": "Duyệt nạp point",
  "topup.reject": "Từ chối nạp point",
  "coupon.create": "Tạo coupon",
  "coupon.toggle": "Bật / tắt coupon",
  "coupon.delete": "Xóa coupon",
  "settings.save": "Lưu cài đặt",
  "category.create": "Tạo danh mục",
  "category.update": "Sửa danh mục",
  "category.move": "Đổi thứ tự danh mục",
  "category.delete": "Xóa danh mục",
  "publisher.create": "Tạo NPH",
  "publisher.update": "Sửa NPH",
  "publisher.delete": "Xóa NPH",
  "build.replace": "Thay bản build",
  "build.rollback": "Quay lại bản build",
  "release.create": "Thêm bản phát hành",
  "release.delete": "Xóa bản phát hành",
  "app.secret_rotate": "Tạo khóa bí mật app",
  "provision.retry": "Gửi lại đồng bộ GLS",
};

interface Row {
  id: number;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ actor?: string; action?: string }> }) {
  const { actor, action } = await searchParams;
  const supabase = createStoreAdminClient();
  let q = supabase
    .from("admin_audit_log")
    .select("id,actor_email,action,target_type,target_id,detail,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (actor) q = q.eq("actor_email", actor);
  if (action) q = q.eq("action", action);
  const [{ data, error }, { data: actorsRaw }] = await Promise.all([
    q,
    supabase.from("admin_audit_log").select("actor_email").order("created_at", { ascending: false }).limit(1000),
  ]);
  const rows = (data ?? []) as Row[];
  const actors = [...new Set((actorsRaw ?? []).map((r) => r.actor_email).filter(Boolean))] as string[];

  // Tên sản phẩm cho các dòng nhắm vào sản phẩm.
  const productIds = [...new Set(rows.filter((r) => r.target_type === "product" && r.target_id).map((r) => r.target_id!))];
  const { data: prods } = productIds.length
    ? await supabase.from("products").select("id,title").in("id", productIds)
    : { data: [] as { id: string; title: string }[] };
  const titleOf = new Map((prods ?? []).map((p) => [p.id, p.title]));

  const filterLink = (next: { actor?: string; action?: string }) => {
    const sp = new URLSearchParams();
    const a = "actor" in next ? next.actor : actor;
    const b = "action" in next ? next.action : action;
    if (a) sp.set("actor", a);
    if (b) sp.set("action", b);
    const qs = sp.toString();
    return `/admin/audit${qs ? `?${qs}` : ""}`;
  };
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 ${active ? "border-accent text-accent" : "border-border text-text-muted hover:text-text"}`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Nhật ký admin</h2>
        <p className="text-sm text-text-muted">200 thao tác gần nhất. Bấm email / thao tác để lọc.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-text-faint">Người:</span>
        <Link href={filterLink({ actor: undefined })} className={chip(!actor)}>
          Tất cả
        </Link>
        {actors.map((a) => (
          <Link key={a} href={filterLink({ actor: a })} className={chip(actor === a)}>
            {a}
          </Link>
        ))}
        {action && (
          <Link href={filterLink({ action: undefined })} className={chip(true)}>
            {ACTION_LABEL[action] ?? action} ✕
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-danger">Không đọc được nhật ký: {error.message}</p>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Thời điểm</th>
              <th className="px-3 py-2 font-medium">Người</th>
              <th className="px-3 py-2 font-medium">Thao tác</th>
              <th className="px-3 py-2 font-medium">Đối tượng</th>
              <th className="px-3 py-2 font-medium">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-text-muted">
                  {new Date(r.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                </td>
                <td className="px-3 py-2">{r.actor_email ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <Link href={filterLink({ action: r.action })} className="hover:text-accent">
                    {ACTION_LABEL[r.action] ?? r.action}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {r.target_type === "product" && r.target_id ? (
                    <Link href={`/admin/products/${r.target_id}/edit`} className="text-brand hover:text-brand-hover">
                      {titleOf.get(r.target_id) ?? `(đã xóa) ${r.target_id.slice(0, 8)}`}
                    </Link>
                  ) : r.target_type === "user" && r.target_id ? (
                    <Link href={`/admin/users/${r.target_id}`} className="text-brand hover:text-brand-hover">
                      người dùng {r.target_id.slice(0, 8)}
                    </Link>
                  ) : (
                    <span className="text-text-muted">
                      {r.target_type ?? "—"}
                      {r.target_id ? ` ${r.target_id.slice(0, 12)}` : ""}
                    </span>
                  )}
                </td>
                <td className="max-w-md px-3 py-2">
                  {r.detail && (
                    <code className="block whitespace-pre-wrap break-words text-xs text-text-faint">
                      {JSON.stringify(r.detail)}
                    </code>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-text-faint">
                  Chưa có thao tác nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
