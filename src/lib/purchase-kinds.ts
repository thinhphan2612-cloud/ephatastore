/**
 * Kiểu mua hợp lệ theo loại sản phẩm — server PHẢI kiểm (trước đây gửi kind=perpetual cho công cụ / tính năng
 * là trả giá 1 tháng mà nhận quyền vĩnh viễn). Khớp các nút mua trên trang sản phẩm.
 */
export type PurchaseKind = "annual" | "freedom" | "topping" | "perpetual" | "software";

export function kindsFor(productType: string): PurchaseKind[] {
  if (productType === "software") return ["software"];
  if (productType === "game" || productType === "asset" || productType === "image") return ["perpetual"];
  return ["annual", "freedom"]; // tool (link ngoài / công cụ), feature
}
