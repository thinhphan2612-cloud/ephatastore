import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { formatDate, formatDateTime } from "@/lib/format";
import { retryProvision } from "@/lib/actions/admin";

export const metadata = { title: "Đồng bộ Giáo Lý Số" };

const ACTION_LABEL: Record<string, string> = { grant_feature: "Bật tính năng", revoke_feature: "Tắt tính năng" };

/** Lệnh bật/tắt tính năng gửi sang Giáo Lý Số. Lỗi → bấm Thử lại (không mất đơn). */
export default async function ProvisionsPage() {
  const { data } = await createStoreAdminClient()
    .from("provision_jobs")
    .select("id,action,payload,status,attempts,last_error,created_at,updated_at,product:products(title)")
    .order("created_at", { ascending: false })
    .limit(100);
  const jobs = (data ?? []) as unknown as {
    id: string;
    action: string;
    payload: { parish_id?: string; feature_key?: string; expires_at?: string | null };
    status: string;
    attempts: number;
    last_error: string | null;
    updated_at: string;
    product: { title: string } | null;
  }[];
  const failed = jobs.filter((j) => j.status !== "done").length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Đồng bộ Giáo Lý Số{" "}
        <span className="text-sm font-normal text-text-muted">
          · {failed ? `${failed} lệnh chưa thành công` : "tất cả đã gửi thành công"}
        </span>
      </h2>
      <p className="max-w-2xl text-sm text-text-muted">
        Khi quản trị giáo xứ mua / dùng thử / được cấp một tính năng Giáo Lý Số, Ephata gửi lệnh bật tính năng cho cả giáo xứ
        sang Giáo Lý Số. Lệnh lỗi được giữ lại ở đây — sửa nguyên nhân rồi bấm Thử lại.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Lệnh</th>
              <th className="px-3 py-2 font-medium">Sản phẩm · feature key</th>
              <th className="px-3 py-2 font-medium">Giáo xứ</th>
              <th className="px-3 py-2 font-medium">Trạng thái</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-text-faint">
                  Chưa có lệnh nào.
                </td>
              </tr>
            )}
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-border align-top">
                <td className="px-3 py-2">
                  {ACTION_LABEL[j.action] ?? j.action}
                  {j.action === "grant_feature" && (
                    <div className="text-xs text-text-faint">
                      {j.payload.expires_at ? `đến ${formatDate(j.payload.expires_at)}` : "vĩnh viễn"}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {j.product?.title ?? "—"}
                  <div className="text-xs text-text-faint">{j.payload.feature_key}</div>
                </td>
                <td className="px-3 py-2 text-xs text-text-muted">{j.payload.parish_id?.slice(0, 8)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      j.status === "done" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                    }`}
                  >
                    {j.status === "done" ? "Đã gửi" : j.status === "failed" ? "Lỗi" : "Đang chờ"}
                  </span>
                  <div className="mt-1 text-xs text-text-faint">
                    {j.attempts} lần · {formatDateTime(j.updated_at)}
                  </div>
                  {j.last_error && <div className="mt-1 max-w-xs break-words text-xs text-danger">{j.last_error}</div>}
                </td>
                <td className="px-3 py-2">
                  {j.status !== "done" && (
                    <form action={retryProvision}>
                      <input type="hidden" name="id" value={j.id} />
                      <button type="submit" className="rounded-md border border-accent px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/10">
                        Thử lại
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
