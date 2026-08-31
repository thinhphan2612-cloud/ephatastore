-- ============================================================
-- 0007 — Catalog v3 (8 danh mục đối tượng + ~35 sản phẩm, tier/trial).
-- CHẠY TRONG SUPABASE STORE. Xoá catalog + đơn/quyền TEST cũ rồi seed mới.
-- ============================================================

-- dọn dữ liệu test cũ + catalog cũ
delete from entitlements;
delete from order_items;
delete from orders;
delete from products;
delete from categories;

-- cột mô hình giá mới
alter table products add column if not exists tier text not null default 'free';
alter table products add column if not exists price_month int not null default 0;
alter table products add column if not exists trial boolean not null default false;
alter table products add column if not exists trial_days int not null default 7;
alter table products add column if not exists active boolean not null default true;
alter table products add column if not exists icon text;

-- danh mục nhiều-nhiều
create table if not exists product_categories(
  product_id uuid references products(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key(product_id, category_id)
);
alter table product_categories enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='product_categories' and policyname='public read product_categories') then
    create policy "public read product_categories" on product_categories for select using (true);
  end if;
end $$;

-- publisher chung
insert into publishers(slug,name,verified) values ('ephata','Ephata Team',true) on conflict (slug) do nothing;

-- 8 danh mục
insert into categories(slug,name,icon,description,sort_order) values
  ('linh-muc-quan-xu','Linh mục quản xứ','✝','Quản lý mục vụ, giáo xứ, giáo lý, tài chính và phụng vụ rõ ràng hơn.',1),
  ('giao-dan','Dành cho giáo dân','♙','Công cụ cho giáo lý viên, giáo dân và các nhu cầu thực tế trong đời sống đức tin.',2),
  ('nguoi-ngoai-cong-giao','Người ngoài Công giáo','⌖','Một điểm bắt đầu thân thiện cho người muốn tìm hiểu đạo và gia đình Công giáo.',3),
  ('hon-nhan-cong-giao','Hôn nhân Công giáo','♡','Giáo lý, giấy tờ, nghi thức và hồ sơ gia đình được gom về một nơi.',4),
  ('thiet-ke-cong-giao','Thiết kế Công giáo','✦','Bộ template có hệ thống cho giáo lý, bí tích, sự kiện và truyền thông giáo xứ.',5),
  ('chung-chi','Chứng chỉ','✓','Mẫu chứng chỉ đẹp, dễ tùy biến cho giáo lý, tuyên hứa và các chương trình.',6),
  ('don-tu-khac','Đơn từ khác','▤','Kho biểu mẫu thực dụng, ưu tiên dễ điền, dễ in và dễ lưu.',7),
  ('game-store','Game Store','◈','Game giáo lý, công cụ trình chiếu và tiện ích sáng tạo cho lớp học và sinh hoạt.',8);

-- sản phẩm
insert into products(slug,title,tagline,description,type,category_id,publisher_id,price_vnd,tier,price_month,trial,trial_days,active,icon,min_plan,is_new,released_at)
select v.slug,v.title,v.tagline,v.description,v.type::product_type,c.id,p.id,v.price_month,v.tier,v.price_month,v.trial,v.trial_days,true,v.icon,v.tier::min_plan,v.is_new,now()
from (values
  ('certificate-catechism','Chứng chỉ Giáo lý','Mẫu chứng chỉ hoàn thành các cấp giáo lý.','Mẫu chứng chỉ hoàn thành các cấp giáo lý.','asset','chung-chi',0,'free',false,7,false,'✓'),
  ('certificate-catechist','Chứng nhận Giáo lý viên','Mẫu dành cho đào tạo, tuyên hứa và sai đi giáo lý viên.','Mẫu dành cho đào tạo, tuyên hứa và sai đi giáo lý viên.','asset','chung-chi',29000,'pro',true,7,false,'✓'),
  ('certificate-event','Chứng nhận sự kiện','Mẫu dùng cho hội trại, khóa huấn luyện và cuộc thi.','Mẫu dùng cho hội trại, khóa huấn luyện và cuộc thi.','asset','chung-chi',0,'free',false,7,true,'✓'),
  ('form-register','Mẫu đăng ký','Đăng ký khóa học, sự kiện, hội trại và hoạt động mục vụ.','Đăng ký khóa học, sự kiện, hội trại và hoạt động mục vụ.','tool','don-tu-khac',0,'free',false,7,false,'▤'),
  ('form-confirm','Mẫu xác nhận','Các mẫu xác nhận thông tin và tham gia chương trình.','Các mẫu xác nhận thông tin và tham gia chương trình.','tool','don-tu-khac',0,'free',false,7,false,'▤'),
  ('form-request','Mẫu đề nghị','Mẫu đề nghị hỗ trợ, sử dụng cơ sở vật chất và nhu cầu nội bộ.','Mẫu đề nghị hỗ trợ, sử dụng cơ sở vật chất và nhu cầu nội bộ.','tool','don-tu-khac',0,'free',false,7,false,'▤'),
  ('game-cards','Game thẻ giáo lý','Game nhiều chủ đề: Kinh Thánh, bí tích, phụng vụ, các thánh và giáo lý căn bản.','Game nhiều chủ đề: Kinh Thánh, bí tích, phụng vụ, các thánh và giáo lý căn bản.','game','game-store',0,'free',false,7,false,'◈'),
  ('golden-bell','Rung Chuông Vàng','Chương trình thi có bảng câu hỏi, điều khiển, trình chiếu và quản lý vòng chơi.','Chương trình thi có bảng câu hỏi, điều khiển, trình chiếu và quản lý vòng chơi.','game','game-store',79000,'pro',true,7,false,'◈'),
  ('image-upscale','Upscale ảnh','Công cụ làm rõ và tăng kích thước ảnh dùng cho thiết kế và in ấn.','Công cụ làm rõ và tăng kích thước ảnh dùng cho thiết kế và in ấn.','tool','game-store',49000,'pro',true,3,false,'⌁'),
  ('email-builder','Tạo email chuyên nghiệp','Soạn email HTML đẹp, có bố cục sẵn cho giáo xứ và chương trình.','Soạn email HTML đẹp, có bố cục sẵn cho giáo xứ và chương trình.','tool','game-store',0,'free',false,7,false,'✉'),
  ('catechist-class','Quản lý giáo lý cho Giáo lý viên','Danh sách lớp, điểm danh, bài học, kiểm tra và theo dõi tiến độ học viên.','Danh sách lớp, điểm danh, bài học, kiểm tra và theo dõi tiến độ học viên.','tool','giao-dan',0,'free',false,7,false,'▦'),
  ('lay-forms','Mẫu đơn Công giáo cho giáo dân','Mẫu đơn phổ biến được trình bày sẵn, dễ điền, dễ in và lưu trữ.','Mẫu đơn phổ biến được trình bày sẵn, dễ điền, dễ in và lưu trữ.','tool','giao-dan',0,'free',false,7,false,'▤'),
  ('funeral-home','An táng · chuẩn bị tư gia','Checklist và hướng dẫn chuẩn bị tại tư gia khi có người qua đời.','Checklist và hướng dẫn chuẩn bị tại tư gia khi có người qua đời.','tool','giao-dan',0,'free',false,7,false,'✦'),
  ('canon-law-basic','Giáo luật căn bản','Các chủ đề giáo luật thiết thực, trình bày theo ngôn ngữ dễ tra cứu.','Các chủ đề giáo luật thiết thực, trình bày theo ngôn ngữ dễ tra cứu.','tool','giao-dan',29000,'pro',true,7,false,'§'),
  ('catechism-basic','Giáo lý căn bản','Bài học nền tảng về Kinh Tin Kính, bí tích, luân lý và cầu nguyện.','Bài học nền tảng về Kinh Tin Kính, bí tích, luân lý và cầu nguyện.','tool','giao-dan',0,'free',false,7,true,'✦'),
  ('marriage-course','Giáo lý hôn nhân','Bài học chuẩn bị đời sống hôn nhân theo giáo huấn Công giáo.','Bài học chuẩn bị đời sống hôn nhân theo giáo huấn Công giáo.','tool','hon-nhan-cong-giao',59000,'pro',true,7,false,'♡'),
  ('marriage-forms','Mẫu đơn hôn nhân','Biểu mẫu và checklist hồ sơ cho thủ tục hôn phối.','Biểu mẫu và checklist hồ sơ cho thủ tục hôn phối.','tool','hon-nhan-cong-giao',0,'free',false,7,false,'▤'),
  ('marriage-rites','Các nghi thức hôn nhân Công giáo','Tài liệu tham khảo cho nghi thức hôn phối trong và ngoài Thánh lễ.','Tài liệu tham khảo cho nghi thức hôn phối trong và ngoài Thánh lễ.','tool','hon-nhan-cong-giao',0,'free',false,7,false,'✦'),
  ('catholic-family-book','Sổ gia đình Công giáo','Mẫu sổ lưu thông tin gia đình, bí tích và các mốc mục vụ.','Mẫu sổ lưu thông tin gia đình, bí tích và các mốc mục vụ.','tool','hon-nhan-cong-giao',39000,'pro',true,7,false,'▦'),
  ('parish-fund','Quản lý xin lễ · dâng cúng · gây quỹ','Tiếp nhận ý lễ, ghi nhận dâng cúng, công khai tiến độ gây quỹ và phát thông báo online.','Tiếp nhận ý lễ, ghi nhận dâng cúng, công khai tiến độ gây quỹ và phát thông báo online.','tool','linh-muc-quan-xu',129000,'pro',true,7,false,'✝'),
  ('catechism-admin','Quản lý giáo lý','Theo dõi lớp, giáo lý viên, học viên, điểm danh, kết quả và năm học giáo lý.','Theo dõi lớp, giáo lý viên, học viên, điểm danh, kết quả và năm học giáo lý.','tool','linh-muc-quan-xu',99000,'pro',true,14,false,'▦'),
  ('parish-admin','Quản lý giáo xứ','Thông báo, lịch phụng vụ, hồ sơ và vận hành nội bộ giáo xứ.','Thông báo, lịch phụng vụ, hồ sơ và vận hành nội bộ giáo xứ.','tool','linh-muc-quan-xu',149000,'pro',true,14,false,'⌂'),
  ('admin-forms','Đơn từ hành chính','Kho biểu mẫu hành chính thường dùng trong hoạt động giáo xứ.','Kho biểu mẫu hành chính thường dùng trong hoạt động giáo xứ.','tool','linh-muc-quan-xu',0,'free',false,7,false,'▤'),
  ('catholic-forms','Đơn từ Công giáo','Mẫu đơn bí tích, xác nhận, giới thiệu, chuyển xứ và các nhu cầu mục vụ.','Mẫu đơn bí tích, xác nhận, giới thiệu, chuyển xứ và các nhu cầu mục vụ.','tool','linh-muc-quan-xu',39000,'pro',true,7,false,'▤'),
  ('liturgy-sacraments','Phụng vụ & Bí tích','Tài liệu chuẩn bị cử hành, checklist và tài nguyên phục vụ bí tích.','Tài liệu chuẩn bị cử hành, checklist và tài nguyên phục vụ bí tích.','tool','linh-muc-quan-xu',0,'free',false,7,false,'✦'),
  ('discover-catholic','Tìm hiểu đạo Công giáo','Lộ trình nhập môn dễ đọc về đức tin và đời sống cộng đoàn.','Lộ trình nhập môn dễ đọc về đức tin và đời sống cộng đoàn.','tool','nguoi-ngoai-cong-giao',0,'free',false,7,true,'⌖'),
  ('catholic-family','Gia đình Công giáo','Giới thiệu cách Giáo hội nhìn về gia đình và giáo dục con cái.','Giới thiệu cách Giáo hội nhìn về gia đình và giáo dục con cái.','tool','nguoi-ngoai-cong-giao',0,'free',false,7,false,'♡'),
  ('marriage-prep','Chuẩn bị Hôn nhân Công giáo','Những điều người khác đạo cần biết khi chuẩn bị kết hôn với người Công giáo.','Những điều người khác đạo cần biết khi chuẩn bị kết hôn với người Công giáo.','tool','nguoi-ngoai-cong-giao',0,'free',false,7,false,'♡'),
  ('confirmation-kit','Bộ thiết kế Thêm Sức','Poster, backdrop, banner, thiệp và chứng nhận đồng bộ.','Poster, backdrop, banner, thiệp và chứng nhận đồng bộ.','asset','thiet-ke-cong-giao',49000,'pro',true,7,false,'✦'),
  ('first-communion-kit','Bộ Rước lễ lần đầu','Visual kit dành cho lớp và lễ Rước lễ lần đầu.','Visual kit dành cho lớp và lễ Rước lễ lần đầu.','asset','thiet-ke-cong-giao',49000,'pro',true,7,false,'✦'),
  ('thanksgiving-kit','Bộ Tạ Ơn','Thiết kế cho Thánh lễ tạ ơn, kỷ niệm và các dịp đặc biệt.','Thiết kế cho Thánh lễ tạ ơn, kỷ niệm và các dịp đặc biệt.','asset','thiet-ke-cong-giao',39000,'pro',true,7,false,'✦'),
  ('consecration-kit','Bộ Thánh hiến','Ấn phẩm trang trọng cho nghi thức thánh hiến và cung hiến.','Ấn phẩm trang trọng cho nghi thức thánh hiến và cung hiến.','asset','thiet-ke-cong-giao',49000,'pro',true,7,false,'✦'),
  ('altar-designs','Mẫu bàn thờ Công giáo','Ý tưởng bố trí và mẫu tham khảo không gian thờ phượng.','Ý tưởng bố trí và mẫu tham khảo không gian thờ phượng.','tool','thiet-ke-cong-giao',0,'free',false,7,false,'✦'),
  ('certificate-templates','Mẫu chứng chỉ','Template chứng nhận, tuyên hứa và hoàn thành khóa học.','Template chứng nhận, tuyên hứa và hoàn thành khóa học.','asset','thiet-ke-cong-giao',29000,'pro',true,7,false,'✓'),
  ('card-templates','Mẫu thiệp','Thiệp mời, cảm ơn, chúc mừng và thông báo.','Thiệp mời, cảm ơn, chúc mừng và thông báo.','asset','thiet-ke-cong-giao',0,'free',false,7,false,'✦')
) as v(slug,title,tagline,description,type,cat_slug,price_month,tier,trial,trial_days,is_new,icon)
join categories c on c.slug=v.cat_slug
join publishers p on p.slug='ephata';

-- liên kết danh mục nhiều-nhiều
insert into product_categories(product_id,category_id)
select pr.id, c.id from (values
  ('certificate-catechism','chung-chi'),
  ('certificate-catechist','chung-chi'),
  ('certificate-event','chung-chi'),
  ('form-register','don-tu-khac'),
  ('form-confirm','don-tu-khac'),
  ('form-request','don-tu-khac'),
  ('game-cards','game-store'),
  ('golden-bell','game-store'),
  ('image-upscale','game-store'),
  ('email-builder','game-store'),
  ('catechist-class','giao-dan'),
  ('lay-forms','giao-dan'),
  ('funeral-home','giao-dan'),
  ('canon-law-basic','giao-dan'),
  ('catechism-basic','giao-dan'),
  ('catechism-basic','hon-nhan-cong-giao'),
  ('catechism-basic','nguoi-ngoai-cong-giao'),
  ('marriage-course','hon-nhan-cong-giao'),
  ('marriage-forms','hon-nhan-cong-giao'),
  ('marriage-rites','hon-nhan-cong-giao'),
  ('catholic-family-book','hon-nhan-cong-giao'),
  ('parish-fund','linh-muc-quan-xu'),
  ('catechism-admin','linh-muc-quan-xu'),
  ('parish-admin','linh-muc-quan-xu'),
  ('admin-forms','linh-muc-quan-xu'),
  ('catholic-forms','linh-muc-quan-xu'),
  ('liturgy-sacraments','linh-muc-quan-xu'),
  ('discover-catholic','nguoi-ngoai-cong-giao'),
  ('catholic-family','nguoi-ngoai-cong-giao'),
  ('marriage-prep','nguoi-ngoai-cong-giao'),
  ('confirmation-kit','thiet-ke-cong-giao'),
  ('first-communion-kit','thiet-ke-cong-giao'),
  ('thanksgiving-kit','thiet-ke-cong-giao'),
  ('consecration-kit','thiet-ke-cong-giao'),
  ('altar-designs','thiet-ke-cong-giao'),
  ('certificate-templates','thiet-ke-cong-giao'),
  ('card-templates','thiet-ke-cong-giao')
) as v(pslug,cslug) join products pr on pr.slug=v.pslug join categories c on c.slug=v.cslug
on conflict do nothing;
