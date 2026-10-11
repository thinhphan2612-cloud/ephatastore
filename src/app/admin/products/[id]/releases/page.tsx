import Link from "next/link";
import { notFound } from "next/navigation";
import { adminGetProduct } from "@/data/admin";
import { listReleases } from "@/data/software";
import { deleteRelease } from "@/lib/actions/software";
import { publicKeyBase64 } from "@/lib/software/license";
import { PLATFORM_LABEL } from "@/lib/software/version";
import { ReleaseUploadForm } from "@/components/admin/release-upload-form";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";

export default async function ReleasesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await adminGetProduct(id);
  if (!product || product.type !== "software") notFound();

  const releases = await listReleases(id);
  const latestId = new Set(
    (["windows", "macos"] as const)
      .map((p) => releases.find((r) => r.platform === p)?.id)
      .filter(Boolean)
  );

  let publicKey: string;
  try {
    publicKey = publicKeyBase64();
  } catch {
    publicKey = "(chưa cấu hình SOFTWARE_LICENSE_SIGNING_JWK)";
  }
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://ephatastore.com").replace(/\/$/, "");

  return (
    <div className="space-y-5">
      <div className="text-sm text-text-faint">
        <Link href="/admin" className="hover:text-text">
          Sản phẩm
        </Link>{" "}
        / Phiên bản
      </div>
      <h2 className="text-lg font-semibold">{product.title}</h2>
      <div className="flex gap-4 border-b border-border text-sm">
        <Link href={`/admin/products/${id}/edit`} className="pb-2 text-text-muted hover:text-text">
          Thông tin
        </Link>
        <span className="border-b-2 border-accent pb-2 font-semibold text-text">Phiên bản</span>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 text-sm">
        <div className="mb-2 font-semibold text-text">Cấu hình cho app (dán vào module license)</div>
        <pre className="overflow-x-auto rounded-md bg-bg-elevated p-3 text-xs text-text">
{`PRODUCT    = "${product.slug}"
API_BASE   = "${site}/api/software/v1"
PUBLIC_KEY = "${publicKey}"`}
        </pre>
        <p className="mt-2 text-xs text-text-faint">
          Trang mua / tải bản mới: {site}/product/{product.slug}
        </p>
      </div>

      <ReleaseUploadForm productId={id} />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Nền tảng</th>
              <th className="px-3 py-2 font-medium">Phiên bản</th>
              <th className="px-3 py-2 font-medium">File</th>
              <th className="px-3 py-2 font-medium">Ngày</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {releases.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-text-faint">
                  Chưa có phiên bản nào.
                </td>
              </tr>
            )}
            {releases.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2">{PLATFORM_LABEL[r.platform]}</td>
                <td className="px-3 py-2">
                  <span className="font-medium text-text">{r.version}</span>
                  {latestId.has(r.id) && (
                    <span className="ml-2 rounded-full border border-success px-2 py-0.5 text-[10px] font-bold text-success">
                      MỚI NHẤT
                    </span>
                  )}
                  {r.notes && <div className="mt-1 whitespace-pre-line text-xs text-text-faint">{r.notes}</div>}
                </td>
                <td className="px-3 py-2">
                  <a
                    href={`/dl/${product.slug}/${r.platform}?version=${r.version}`}
                    className="text-brand hover:text-brand-hover"
                  >
                    {r.file_name}
                  </a>
                  {r.size_bytes != null && (
                    <span className="ml-1 text-xs text-text-faint">
                      ({(r.size_bytes / 1048576).toFixed(1)}MB)
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-text-muted">
                  {new Date(r.created_at).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-3 py-2">
                  <form action={deleteRelease}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmSubmit
                      confirm={`Xóa bản ${r.version} (${PLATFORM_LABEL[r.platform]})? File cũng bị xóa.`}
                      className="text-text-faint hover:text-danger"
                    >
                      Xóa
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
