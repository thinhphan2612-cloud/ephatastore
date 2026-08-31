export function SiteFooter() {
  return (
    <footer className="border-t border-border py-11 text-[13px] text-text-muted">
      <div className="mx-auto grid w-[min(1180px,calc(100%-40px))] gap-6 sm:grid-cols-2 sm:items-end">
        <div>
          <b className="text-text">EPHATA STORE</b>
          <p className="mt-2">Công cụ số cho cộng đồng Công giáo Việt Nam.</p>
        </div>
        <div className="grid gap-1.5 sm:justify-items-end sm:text-right">
          <span>© {new Date().getFullYear()} Ephata Store</span>
          <span>Điều khoản · Quyền riêng tư · Hỗ trợ</span>
        </div>
      </div>
    </footer>
  );
}
