import type { Category } from "@/lib/types";

/** Danh mục gốc của marketplace (MVP). */
export const CATEGORIES: Category[] = [
  {
    id: "cat-tool",
    slug: "cong-cu",
    name: "Công cụ",
    icon: "🛠️",
    description: "Công cụ hỗ trợ mục vụ, quản lý, phụng vụ cho giáo xứ.",
  },
  {
    id: "cat-game",
    slug: "game-giao-ly",
    name: "Game giáo lý",
    icon: "🎮",
    description: "Trò chơi học hỏi Kinh Thánh và giáo lý cho mọi lứa tuổi.",
  },
  {
    id: "cat-asset",
    slug: "asset-thiet-ke",
    name: "Asset thiết kế",
    icon: "🎨",
    description: "Template, font, đồ hoạ dùng cho ấn phẩm Công giáo.",
  },
  {
    id: "cat-image",
    slug: "hinh-anh",
    name: "Hình ảnh",
    icon: "🖼️",
    description: "Kho ảnh thánh, tranh, hình nền chất lượng cao.",
  },
  {
    id: "cat-feature",
    slug: "tinh-nang",
    name: "Tính năng tích hợp",
    icon: "🧩",
    description: "Tính năng cắm thẳng vào app.giaoly.com.vn.",
  },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));
