import type { GalleryItem } from "@/lib/gallery";
/**
 * Mô hình dữ liệu miền của Ephata Store.
 * Đây là hợp đồng dùng chung cho UI; tầng dữ liệu (mock -> Supabase) sẽ trả về đúng shape này.
 */

/** Loại sản phẩm số trên marketplace. */
export type ProductType = "tool" | "game" | "asset" | "image" | "feature" | "software";

/** Gói tối thiểu để dùng/sở hữu sản phẩm (đồng bộ với plan của app.giaoly.com.vn). */
export type MinPlan = "free" | "pro";

/** Tầng sản phẩm trong mô hình giá v3. */
export type Tier = "free" | "pro";

export interface Category {
  id: string;
  slug: string;
  name: string;
  /** ký hiệu/emoji hiển thị nhanh */
  icon: string;
  /** nhãn nhỏ phía trên tên (eyebrow) */
  eyebrow?: string;
  description?: string;
}

export interface Publisher {
  id: string;
  slug: string;
  name: string;
  avatarUrl?: string;
  verified?: boolean;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  /** một dòng mô tả ngắn hiện dưới tiêu đề */
  tagline: string;
  description: string;
  /** mô tả chi tiết dạng HTML (đã lọc khi lưu; lọc lại khi hiển thị) — null thì dùng description */
  descriptionHtml?: string | null;
  type: ProductType;
  /** danh mục chính (dùng cho breadcrumb) */
  categoryId: string;
  /** tất cả danh mục thuộc về (nhiều-nhiều) */
  categorySlugs: string[];
  publisher: Publisher;

  /** giá hiện tại (VND). 0 = miễn phí. */
  price: number;
  /** giá gốc trước giảm (VND), nếu đang giảm giá */
  originalPrice?: number;

  coverUrl: string;
  /** ảnh / video minh họa cho trang chi tiết (tối đa 4, lib/gallery) */
  gallery: GalleryItem[];
  /** logo ứng dụng (ảnh vuông); không có = dùng icon */
  logoUrl?: string;
  tags: string[];

  /** gói tối thiểu; null = ai cũng mua/dùng được */
  minPlan: MinPlan | null;

  /** mô hình giá v3 */
  tier: Tier;
  /** giá theo tháng (VND); 0 nếu free */
  priceMonth: number;
  trial: boolean;
  trialDays: number;
  active: boolean;
  /** ký hiệu hiển thị */
  icon?: string;
  /** URL mở tiện ích web-app (tool/feature) khi đã sở hữu */
  appUrl?: string;
  /** đường dẫn app host trên store (/g/<id>/index.html) — game hoặc công cụ web */
  gameUrl?: string;
  /** true = tài khoản có gói Pro Giáo Lý Số dùng/nhận miễn phí (không áp cho phần mềm bán key) */
  giaolyProFree: boolean;
  /** App tính phí theo lượt dùng — trừ point qua Ví Ephata */
  usesWallet: boolean;
  /** Tính năng Giáo Lý Số (bật cho cả giáo xứ khi quản trị giáo xứ mua) */
  giaolyFeatureKey?: string;

  /** 0..5 */
  rating: number;
  ratingCount: number;

  releasedAt: string; // ISO date
  featured?: boolean;
  isNew?: boolean;
  isPopular?: boolean;
}
