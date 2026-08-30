import type { Category } from "@/lib/types";

/**
 * Danh mục theo ĐỐI TƯỢNG (prototype v3). id = slug, trùng slug bảng categories DB.
 */
export const CATEGORIES: Category[] = [
  {
    id: "linh-muc-quan-xu",
    slug: "linh-muc-quan-xu",
    name: "Linh mục quản xứ",
    icon: "✝",
    eyebrow: "Quản trị mục vụ",
    description:
      "Quản lý mục vụ, giáo xứ, giáo lý, tài chính và phụng vụ rõ ràng hơn.",
  },
  {
    id: "giao-dan",
    slug: "giao-dan",
    name: "Dành cho giáo dân",
    icon: "♙",
    eyebrow: "Học hỏi & phục vụ",
    description:
      "Công cụ cho giáo lý viên, giáo dân và các nhu cầu thực tế trong đời sống đức tin.",
  },
  {
    id: "nguoi-ngoai-cong-giao",
    slug: "nguoi-ngoai-cong-giao",
    name: "Người ngoài Công giáo",
    icon: "⌖",
    eyebrow: "Tìm hiểu Công giáo",
    description:
      "Một điểm bắt đầu thân thiện cho người muốn tìm hiểu đạo và gia đình Công giáo.",
  },
  {
    id: "hon-nhan-cong-giao",
    slug: "hon-nhan-cong-giao",
    name: "Hôn nhân Công giáo",
    icon: "♡",
    eyebrow: "Chuẩn bị & đồng hành",
    description:
      "Giáo lý, giấy tờ, nghi thức và hồ sơ gia đình được gom về một nơi.",
  },
  {
    id: "thiet-ke-cong-giao",
    slug: "thiet-ke-cong-giao",
    name: "Thiết kế Công giáo",
    icon: "✦",
    eyebrow: "Template & ấn phẩm",
    description:
      "Bộ template có hệ thống cho giáo lý, bí tích, sự kiện và truyền thông giáo xứ.",
  },
  {
    id: "chung-chi",
    slug: "chung-chi",
    name: "Chứng chỉ",
    icon: "✓",
    eyebrow: "Certificate center",
    description:
      "Mẫu chứng chỉ đẹp, dễ tùy biến cho giáo lý, tuyên hứa và các chương trình.",
  },
  {
    id: "don-tu-khac",
    slug: "don-tu-khac",
    name: "Đơn từ khác",
    icon: "▤",
    eyebrow: "Biểu mẫu nhanh",
    description: "Kho biểu mẫu thực dụng, ưu tiên dễ điền, dễ in và dễ lưu.",
  },
  {
    id: "game-store",
    slug: "game-store",
    name: "Game Store",
    icon: "◈",
    eyebrow: "Game & tiện ích",
    description:
      "Game giáo lý, công cụ trình chiếu và tiện ích sáng tạo cho lớp học và sinh hoạt.",
  },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));
