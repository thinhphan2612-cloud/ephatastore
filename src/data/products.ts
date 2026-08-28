import type { Product, Publisher } from "@/lib/types";

/**
 * Dữ liệu mẫu cho MVP. Tầng này sẽ được thay bằng truy vấn Supabase (DB store)
 * mà không đổi chữ ký hàm bên dưới.
 */

const P: Record<string, Publisher> = {
  ephata: { id: "pub-ephata", slug: "ephata", name: "Ephata Team", verified: true },
  verse126: { id: "pub-126verse", slug: "126verse", name: "126verse", verified: true },
  giaoxu: { id: "pub-giaoxu-studio", slug: "giaoxu-studio", name: "Giáo Xứ Studio" },
  lumen: { id: "pub-lumen", slug: "lumen", name: "Lumen Creative" },
};

export const PRODUCTS: Product[] = [
  {
    id: "prd-quan-ly-giao-ly",
    slug: "bo-cong-cu-quan-ly-giao-ly",
    title: "Bộ công cụ Quản lý Giáo lý",
    tagline: "Điểm danh, chấm điểm, xếp lớp — tất cả trong một.",
    description:
      "Công cụ toàn diện cho ban giáo lý viên: quản lý danh sách học viên theo lớp, điểm danh nhanh, theo dõi tiến độ học tập và xuất báo cáo cuối khoá. Tích hợp trực tiếp với hệ thống giáo dân theo giáo xứ.",
    type: "tool",
    categoryId: "cat-tool",
    publisher: P.ephata,
    price: 299000,
    originalPrice: 499000,
    coverUrl: "",
    gallery: [],
    tags: ["giáo lý", "quản lý", "giáo xứ", "báo cáo"],
    minPlan: "pro",
    rating: 4.8,
    ratingCount: 142,
    releasedAt: "2026-06-15",
    featured: true,
    isPopular: true,
  },
  {
    id: "prd-hanh-trinh-emmau",
    slug: "hanh-trinh-emmau",
    title: "Hành Trình Emmau",
    tagline: "Game phiêu lưu học Kinh Thánh Tân Ước.",
    description:
      "Đồng hành cùng hai môn đệ trên đường Emmau, giải các câu đố dựa trên Tin Mừng và khám phá câu chuyện Phục Sinh. Phù hợp thiếu nhi và dự tòng.",
    type: "game",
    categoryId: "cat-game",
    publisher: P.verse126,
    price: 0,
    coverUrl: "",
    gallery: [],
    tags: ["Kinh Thánh", "thiếu nhi", "phiêu lưu", "Tân Ước"],
    minPlan: "free",
    rating: 4.6,
    ratingCount: 310,
    releasedAt: "2026-07-01",
    featured: true,
    isNew: true,
    isPopular: true,
  },
  {
    id: "prd-do-vui-giao-ly",
    slug: "do-vui-giao-ly-online",
    title: "Đố Vui Giáo Lý",
    tagline: "1000+ câu hỏi trắc nghiệm, chơi theo đội.",
    description:
      "Bộ đố vui trắc nghiệm giáo lý theo cấp độ Khai Tâm đến Vào Đời, hỗ trợ chơi theo đội trong buổi sinh hoạt. Có bảng xếp hạng và câu hỏi cập nhật hằng tuần.",
    type: "game",
    categoryId: "cat-game",
    publisher: P.ephata,
    price: 149000,
    coverUrl: "",
    gallery: [],
    tags: ["trắc nghiệm", "sinh hoạt", "đội nhóm"],
    minPlan: null,
    rating: 4.5,
    ratingCount: 88,
    releasedAt: "2026-05-20",
    isPopular: true,
  },
  {
    id: "prd-template-thiep-le",
    slug: "template-thiep-le-trong",
    title: "Template Thiệp Lễ Trọng",
    tagline: "40 mẫu thiệp Canva cho các lễ lớn trong năm.",
    description:
      "Bộ 40 template Canva chỉnh sửa được cho Giáng Sinh, Phục Sinh, lễ bổn mạng, thêm sức, rước lễ lần đầu... Định dạng in ấn và mạng xã hội.",
    type: "asset",
    categoryId: "cat-asset",
    publisher: P.lumen,
    price: 199000,
    originalPrice: 350000,
    coverUrl: "",
    gallery: [],
    tags: ["Canva", "thiệp", "in ấn", "lễ trọng"],
    minPlan: null,
    rating: 4.9,
    ratingCount: 205,
    releasedAt: "2026-04-10",
    featured: true,
    isPopular: true,
  },
  {
    id: "prd-font-thu-phap",
    slug: "bo-font-thu-phap-cong-giao",
    title: "Bộ Font Thư Pháp Công Giáo",
    tagline: "6 font thư pháp Việt cho câu Lời Chúa.",
    description:
      "Sáu font thư pháp Việt hoá hoàn chỉnh, hỗ trợ dấu tiếng Việt đầy đủ, lý tưởng để trình bày câu Lời Chúa, băng rôn và ấn phẩm phụng vụ.",
    type: "asset",
    categoryId: "cat-asset",
    publisher: P.lumen,
    price: 129000,
    coverUrl: "",
    gallery: [],
    tags: ["font", "thư pháp", "tiếng Việt"],
    minPlan: null,
    rating: 4.7,
    ratingCount: 64,
    releasedAt: "2026-03-28",
    isNew: false,
  },
  {
    id: "prd-kho-anh-thanh",
    slug: "kho-anh-thanh-4k",
    title: "Kho Ảnh Thánh 4K",
    tagline: "500 ảnh thánh & tranh cổ điển độ phân giải cao.",
    description:
      "Bộ sưu tập 500 ảnh thánh, tranh cổ điển và hình nền độ phân giải 4K, phân loại theo mùa phụng vụ và thánh bổn mạng. Giấy phép dùng trong sinh hoạt giáo xứ.",
    type: "image",
    categoryId: "cat-image",
    publisher: P.giaoxu,
    price: 249000,
    coverUrl: "",
    gallery: [],
    tags: ["ảnh thánh", "4K", "hình nền", "phụng vụ"],
    minPlan: null,
    rating: 4.6,
    ratingCount: 121,
    releasedAt: "2026-02-14",
    isPopular: true,
  },
  {
    id: "prd-lich-phung-vu",
    slug: "tinh-nang-lich-phung-vu",
    title: "Lịch Phụng Vụ Tự Động",
    tagline: "Cắm vào app: lịch phụng vụ, bài đọc mỗi ngày.",
    description:
      "Tính năng tích hợp hiển thị lịch phụng vụ Công giáo, màu áo lễ, bài đọc và Tin Mừng mỗi ngày ngay trong app.giaoly.com.vn. Cập nhật tự động theo năm phụng vụ.",
    type: "feature",
    categoryId: "cat-feature",
    publisher: P.ephata,
    price: 0,
    coverUrl: "",
    gallery: [],
    tags: ["phụng vụ", "lịch", "bài đọc", "tích hợp"],
    minPlan: "free",
    rating: 4.9,
    ratingCount: 178,
    releasedAt: "2026-07-20",
    isNew: true,
    featured: true,
  },
  {
    id: "prd-so-quy-giao-xu",
    slug: "tinh-nang-so-quy-giao-xu",
    title: "Sổ Quỹ Giáo Xứ",
    tagline: "Quản lý thu chi, quỹ, báo cáo minh bạch.",
    description:
      "Tính năng quản lý thu chi và các quỹ của giáo xứ, kèm báo cáo minh bạch cho hội đồng mục vụ. Phân quyền theo vai trò, xuất PDF/Excel.",
    type: "feature",
    categoryId: "cat-feature",
    publisher: P.ephata,
    price: 399000,
    coverUrl: "",
    gallery: [],
    tags: ["tài chính", "quỹ", "báo cáo", "tích hợp"],
    minPlan: "pro",
    rating: 4.7,
    ratingCount: 53,
    releasedAt: "2026-06-30",
    isNew: true,
  },
  {
    id: "prd-noel-2026-pack",
    slug: "goi-thiet-ke-giang-sinh-2026",
    title: "Gói Thiết Kế Giáng Sinh 2026",
    tagline: "Trọn bộ đồ hoạ cho mùa Giáng Sinh.",
    description:
      "Trọn bộ đồ hoạ mùa Giáng Sinh 2026: phông sân khấu, thiệp, story mạng xã hội, khung ảnh và icon. File nguồn PSD và Canva.",
    type: "asset",
    categoryId: "cat-asset",
    publisher: P.giaoxu,
    price: 279000,
    originalPrice: 450000,
    coverUrl: "",
    gallery: [],
    tags: ["Giáng Sinh", "phông", "story", "PSD"],
    minPlan: null,
    rating: 4.8,
    ratingCount: 97,
    releasedAt: "2026-08-01",
    isNew: true,
    isPopular: true,
  },
  {
    id: "prd-hanh-huong-quiz",
    slug: "game-hanh-huong-thanh-dia",
    title: "Hành Hương Thánh Địa",
    tagline: "Game bản đồ khám phá các trung tâm hành hương.",
    description:
      "Khám phá các trung tâm hành hương Công giáo qua bản đồ tương tác, trả lời câu hỏi lịch sử và tích luỹ huy hiệu. Kết nối với khu hành hương thực tế.",
    type: "game",
    categoryId: "cat-game",
    publisher: P.verse126,
    price: 99000,
    coverUrl: "",
    gallery: [],
    tags: ["hành hương", "bản đồ", "lịch sử"],
    minPlan: null,
    rating: 4.4,
    ratingCount: 41,
    releasedAt: "2026-08-10",
    isNew: true,
  },
  {
    id: "prd-icon-phung-vu",
    slug: "bo-icon-phung-vu",
    title: "Bộ Icon Phụng Vụ",
    tagline: "240 icon vector chủ đề Công giáo.",
    description:
      "240 icon vector (SVG) chủ đề phụng vụ và bí tích, nét đồng nhất, dùng cho slide, app và ấn phẩm. Bao gồm bản line và bản đặc.",
    type: "asset",
    categoryId: "cat-asset",
    publisher: P.lumen,
    price: 89000,
    coverUrl: "",
    gallery: [],
    tags: ["icon", "SVG", "vector"],
    minPlan: null,
    rating: 4.5,
    ratingCount: 72,
    releasedAt: "2026-01-18",
  },
  {
    id: "prd-diem-danh-thieu-nhi",
    slug: "cong-cu-diem-danh-thieu-nhi",
    title: "Điểm Danh Thiếu Nhi",
    tagline: "Quét QR điểm danh Thiếu Nhi Thánh Thể.",
    description:
      "Ứng dụng điểm danh nhanh bằng QR cho các đoàn Thiếu Nhi Thánh Thể, thống kê chuyên cần và nhắc phụ huynh tự động.",
    type: "tool",
    categoryId: "cat-tool",
    publisher: P.ephata,
    price: 179000,
    coverUrl: "",
    gallery: [],
    tags: ["QR", "điểm danh", "thiếu nhi"],
    minPlan: null,
    rating: 4.6,
    ratingCount: 60,
    releasedAt: "2026-05-05",
    isPopular: true,
  },
];

// ---- Truy vấn (chữ ký giữ nguyên khi chuyển sang Supabase) ----

export function getAllProducts(): Product[] {
  return PRODUCTS;
}

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductsByCategory(categoryId: string): Product[] {
  return PRODUCTS.filter((p) => p.categoryId === categoryId);
}

export function getFeatured(): Product[] {
  return PRODUCTS.filter((p) => p.featured);
}

export function getNewReleases(): Product[] {
  return [...PRODUCTS]
    .filter((p) => p.isNew)
    .sort((a, b) => +new Date(b.releasedAt) - +new Date(a.releasedAt));
}

export function getPopular(): Product[] {
  return [...PRODUCTS]
    .filter((p) => p.isPopular)
    .sort((a, b) => b.ratingCount - a.ratingCount);
}

export function getRelated(product: Product, limit = 4): Product[] {
  return PRODUCTS.filter(
    (p) => p.id !== product.id && p.categoryId === product.categoryId
  ).slice(0, limit);
}
