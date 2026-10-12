-- 0026 — Logo ứng dụng + ảnh / video minh họa cho trang sản phẩm.
--   products.logo_url  : ảnh logo (vuông) — null = dùng icon mặc định.
--   products.gallery   : (đã có, jsonb) tối đa 4 mục { type: "image"|"video", url } | { type: "youtube", id }.
--   Bucket product-media (public, 50MB/file): ảnh + video minh họa.
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.

do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'Không thấy bảng public.products — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

alter table public.products add column if not exists logo_url text;

-- Catalog đọc products bằng anon key, chỉ các cột được grant (0024) → PHẢI grant cột mới, không thì catalog lỗi.
grant select (logo_url) on public.products to anon, authenticated;

-- Bucket ảnh / video minh họa (public: trang sản phẩm hiện trực tiếp). Upload chỉ qua signed URL do server (admin) tạo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media', 'product-media', true, 52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
