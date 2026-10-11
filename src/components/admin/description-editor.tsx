"use client";

import { useState } from "react";
import { previewDescription } from "@/lib/actions/admin";

/** Mô tả text cũ (chưa có HTML) → HTML tương đương: đoạn cách nhau dòng trống → <p>, xuống dòng → <br>. */
function textToHtml(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .split(/\n\s*\n/)
    .map((para) => `<p>${para.trim().replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

/**
 * Ô mô tả chi tiết dạng HTML + tab Xem trước. Xem trước gọi server lọc HTML (lib/rich-text) — đúng y như
 * sẽ hiện trên trang sản phẩm; phần bị loại (script, iframe lạ, style không cho phép…) sẽ không thấy.
 */
export function DescriptionEditor({ html, text }: { html?: string | null; text?: string | null }) {
  const [value, setValue] = useState(html ?? textToHtml(text));
  const [tab, setTab] = useState<"html" | "preview">("html");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  async function showPreview() {
    setTab("preview");
    setLoading(true);
    try {
      setPreview(await previewDescription(value));
    } finally {
      setLoading(false);
    }
  }

  const tabBtn = (active: boolean) =>
    `rounded-md px-3 py-1 text-sm ${active ? "bg-surface-hover text-text" : "text-text-muted hover:text-text"}`;

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-text-muted">Mô tả chi tiết (HTML)</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => setTab("html")} className={tabBtn(tab === "html")}>
            HTML
          </button>
          <button type="button" onClick={showPreview} className={tabBtn(tab === "preview")}>
            Xem trước
          </button>
        </div>
      </div>
      {/* Luôn nằm trong form (ẩn khi xem trước) để giá trị được gửi khi Lưu. */}
      <textarea
        name="description_html"
        rows={14}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        spellCheck={false}
        hidden={tab !== "html"}
        placeholder={"<h2>Giới thiệu</h2>\n<p>Mô tả sản phẩm…</p>\n<ul>\n  <li>Tính năng 1</li>\n</ul>"}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-[13px] leading-relaxed text-text focus:border-accent focus:outline-none"
      />
      {tab === "preview" && (
        <div className="min-h-40 rounded-md border border-border bg-surface p-4">
          {loading ? (
            <p className="text-sm text-text-faint">Đang lọc HTML…</p>
          ) : preview ? (
            <div className="rich-text" dangerouslySetInnerHTML={{ __html: preview }} />
          ) : (
            <p className="text-sm text-text-faint">Chưa có nội dung (hoặc toàn bộ bị loại khi lọc).</p>
          )}
        </div>
      )}
      <span className="mt-1 block text-xs text-text-faint">
        Dùng được: h2–h4, đoạn văn, danh sách, bảng, trích dẫn, link/ảnh https, video YouTube (iframe embed), màu chữ /
        căn lề. Script, form, iframe lạ, style định vị bị tự động loại. Quy tắc đầy đủ: App Kit → mô tả sản phẩm.
      </span>
    </div>
  );
}
