import type { Category } from "@/lib/types";

/**
 * Danh mục gốc (tĩnh, dùng cho nav). Trùng slug với bảng categories trong DB store.
 * id = slug để khớp với Product.categoryId (lấy từ category.slug khi join).
 */
export const CATEGORIES: Category[] = [
  {
    id: "cong-cu",
    slug: "cong-cu",
    name: "Công cụ",
    icon: "🛠️",
    description: "Công cụ hỗ trợ mục vụ, quản lý, phụng vụ cho giáo xứ.",
  },
  {
    id: "game-giao-ly",
    slug: "game-giao-ly",
    name: "Game giáo lý",
    icon: "🎮",
    description: "Trò chơi học hỏi Kinh Thánh và giáo lý cho mọi lứa tuổi.",
  },
  {
    id: "asset-thiet-ke",
    slug: "asset-thiet-ke",
    name: "Asset thiết kế",
    icon: "🎨",
    description: "Template, font, đồ hoạ dùng cho ấn phẩm Công giáo.",
  },
  {
    id: "hinh-anh",
    slug: "hinh-anh",
    name: "Hình ảnh",
    icon: "🖼️",
    description: "Kho ảnh thánh, tranh, hình nền chất lượng cao.",
  },
  {
    id: "tinh-nang",
    slug: "tinh-nang",
    name: "Tính năng tích hợp",
    icon: "🧩",
    description: "Tính năng cắm thẳng vào app.giaoly.com.vn.",
  },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));
