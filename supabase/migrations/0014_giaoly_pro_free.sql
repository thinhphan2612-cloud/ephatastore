-- 0014 — Nhãn "Miễn phí cho Pro Giáo Lý Số" theo từng sản phẩm (thay luật cũ: Pro dùng free mọi thứ).
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf), KHÔNG phải Giáo Lý Số.
-- Lần đầu chạy: sản phẩm hiện có (trừ phần mềm bán key) được bật sẵn để giữ nguyên hành vi cũ.
-- Chạy lại: không làm gì (không ghi đè lựa chọn đã chỉnh sau này).
do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'Không thấy bảng public.products — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'products' and column_name = 'giaoly_pro_free'
  ) then
    alter table public.products add column giaoly_pro_free boolean not null default false;
    update public.products set giaoly_pro_free = true where type <> 'software';
  end if;
end $$;
