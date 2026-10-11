-- 0019 — Mô tả chi tiết sản phẩm dạng HTML (đã lọc phía server). products.description giữ text thuần
-- (server tự rút từ HTML khi lưu) cho trang chủ, thẻ meta, tìm kiếm.
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.

do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'Không thấy bảng public.products — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

alter table public.products add column if not exists description_html text;  -- null = dùng description (text thuần)
