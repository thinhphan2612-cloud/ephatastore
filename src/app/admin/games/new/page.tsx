import Link from "next/link";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { GameUploadForm } from "@/components/admin/game-upload-form";

export default async function NewGamePage() {
  const supabase = createStoreAdminClient();
  const [{ data: cats }, { data: pubs }] = await Promise.all([
    supabase.from("categories").select("id,slug,name").order("sort_order").order("created_at"),
    supabase.from("publishers").select("id,slug,name").order("name"),
  ]);
  const categories = cats ?? [];
  const publishers = pubs ?? [];

  return (
    <div className="space-y-5">
      <div className="text-sm text-text-faint">
        <Link href="/admin" className="hover:text-text">
          Sản phẩm
        </Link>{" "}
        / Tải lên game
      </div>
      <h2 className="text-lg font-semibold">Tải lên webgame (.zip)</h2>
      <p className="max-w-xl text-sm text-text-muted">
        Chọn file .zip chứa <code className="text-text">index.html</code> + tài nguyên. Hệ
        thống tự giải nén, host và tạo game vào danh mục đã chọn — chơi trực tiếp trên store.
      </p>
      <GameUploadForm
        categories={categories.map(({ id, name }) => ({ id, name }))}
        publishers={publishers.map(({ id, name }) => ({ id, name }))}
        defaultCategoryId={categories.find((c) => c.slug === "game-store")?.id}
        defaultPublisherId={publishers.find((p) => p.slug === "ephata")?.id}
      />
    </div>
  );
}
