-- 0013a — Loại sản phẩm thứ 5: phần mềm cài đặt (bán key). Spec: docs/software-licensing.md
-- CHẠY RIÊNG, TRƯỚC 0013b: Postgres không cho dùng giá trị enum mới trong cùng transaction với ADD VALUE.
alter type product_type add value if not exists 'software';
