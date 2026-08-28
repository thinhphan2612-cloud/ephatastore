/**
 * Mô hình dữ liệu miền của Ephata Store.
 * Đây là hợp đồng dùng chung cho UI; tầng dữ liệu (mock -> Supabase) sẽ trả về đúng shape này.
 */

/** Loại sản phẩm số trên marketplace. */
export type ProductType = "tool" | "game" | "asset" | "image" | "feature";

/** Gói tối thiểu để dùng/sở hữu sản phẩm (đồng bộ với plan của app.giaoly.com.vn). */
export type MinPlan = "free" | "pro";

export interface Category {
  id: string;
  slug: string;
  name: string;
  /** tên emoji/icon đơn giản để hiển thị nhanh ở MVP */
  icon: string;
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
  type: ProductType;
  categoryId: string;
  publisher: Publisher;

  /** giá hiện tại (VND). 0 = miễn phí. */
  price: number;
  /** giá gốc trước giảm (VND), nếu đang giảm giá */
  originalPrice?: number;

  coverUrl: string;
  /** ảnh gallery cho trang chi tiết */
  gallery: string[];
  tags: string[];

  /** gói tối thiểu; null = ai cũng mua/dùng được */
  minPlan: MinPlan | null;

  /** 0..5 */
  rating: number;
  ratingCount: number;

  releasedAt: string; // ISO date
  featured?: boolean;
  isNew?: boolean;
  isPopular?: boolean;
}

/** phần trăm giảm giá, làm tròn; 0 nếu không giảm */
export function discountPercent(p: Product): number {
  if (!p.originalPrice || p.originalPrice <= p.price) return 0;
  return Math.round((1 - p.price / p.originalPrice) * 100);
}
