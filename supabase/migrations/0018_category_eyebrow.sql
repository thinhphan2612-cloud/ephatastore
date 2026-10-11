-- 0018 — Danh mục quản lý từ admin: thêm cột eyebrow (nhãn nhỏ trên tên danh mục) — trước đây fix cứng trong code.
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.

do $$
begin
  if to_regclass('public.categories') is null then
    raise exception 'Không thấy bảng public.categories — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

alter table public.categories add column if not exists eyebrow text;

-- Điền eyebrow cho 8 danh mục có sẵn (giá trị lấy từ src/data/categories.ts cũ); không ghi đè nếu đã sửa.
update public.categories c set eyebrow = v.eyebrow
from (values
  ('linh-muc-quan-xu',      'Quản trị mục vụ'),
  ('giao-dan',              'Học hỏi & phục vụ'),
  ('nguoi-ngoai-cong-giao', 'Tìm hiểu Công giáo'),
  ('hon-nhan-cong-giao',    'Chuẩn bị & đồng hành'),
  ('thiet-ke-cong-giao',    'Template & ấn phẩm'),
  ('chung-chi',             'Certificate center'),
  ('don-tu-khac',           'Biểu mẫu nhanh'),
  ('game-store',            'Game & tiện ích')
) as v(slug, eyebrow)
where c.slug = v.slug and c.eyebrow is null;
