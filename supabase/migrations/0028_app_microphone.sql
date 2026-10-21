-- 0028 — App chạy trên store cần micro (vd luyện hát): trang /play chỉ thêm `microphone` vào `allow` của khung chơi
--        khi sản phẩm bật cờ này. Mọi app chung origin play.ephatastore.com → không cấp micro cho app không cần.
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.
-- Chạy SQL này TRƯỚC khi deploy code đọc cột uses_microphone (trang /play, form admin).

do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'Không thấy bảng public.products — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

alter table public.products add column if not exists uses_microphone boolean not null default false; -- khung chơi cho phép micro
