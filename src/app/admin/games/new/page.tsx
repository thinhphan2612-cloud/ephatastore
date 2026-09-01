import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import { GameUploadForm } from "@/components/admin/game-upload-form";

export default function NewGamePage() {
  const categories = CATEGORIES.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));

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
      <GameUploadForm categories={categories} />
    </div>
  );
}
