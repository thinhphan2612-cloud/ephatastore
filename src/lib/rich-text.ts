import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Mô tả sản phẩm dạng HTML do admin nhập — hiển thị trên domain store (nơi cookie phiên đọc được bằng JS),
 * nên LUÔN lọc theo danh sách cho phép: chỉ thẻ trình bày, link/ảnh https, iframe YouTube embed,
 * style giới hạn (màu, căn lề, kiểu chữ). Không script, không on*, không form, không định vị phần tử.
 */

const MAX_HTML = 100_000;
const YOUTUBE_EMBED = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/[\w-]+/;
const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "mark", "small", "sub", "sup",
    "blockquote", "ul", "ol", "li", "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "code", "pre", "span", "div", "iframe",
  ],
  allowedAttributes: {
    // target/rel/loading/allow/referrerpolicy: do transformTags đặt (giá trị admin gõ bị ghi đè).
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    iframe: ["src", "title", "width", "height", "allowfullscreen", "loading", "allow", "referrerpolicy"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    ol: ["start"],
    "*": ["style"],
  },
  allowedStyles: {
    "*": {
      color: COLOR,
      "background-color": COLOR,
      "text-align": [/^(left|right|center|justify)$/],
      "font-weight": [/^(normal|bold|bolder|lighter|[1-9]00)$/],
      "font-style": [/^(normal|italic)$/],
      "text-decoration": [/^(none|underline|line-through)$/],
    },
  },
  allowedSchemes: ["https", "mailto"],
  allowedSchemesByTag: { img: ["https"], iframe: ["https"] },
  allowProtocolRelative: false,
  allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"],
  transformTags: {
    h1: "h2", // trang đã có h1 là tên sản phẩm
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" } }),
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
    iframe: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: "lazy", allow: "encrypted-media; picture-in-picture; fullscreen", referrerpolicy: "strict-origin-when-cross-origin" },
    }),
  },
  // iframe chỉ giữ link embed YouTube (không cho trang khác của youtube.com); ảnh chỉ URL https tuyệt đối
  // (đường dẫn tương đối sẽ gọi request tới chính store).
  exclusiveFilter: (frame) =>
    (frame.tag === "iframe" && !YOUTUBE_EMBED.test(frame.attribs.src ?? "")) ||
    (frame.tag === "img" && !/^https:\/\//i.test(frame.attribs.src ?? "")),
};

/** HTML an toàn để hiển thị (rỗng nếu không còn nội dung). */
export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html.slice(0, MAX_HTML), OPTIONS).trim();
}

/** Text thuần rút từ HTML (cho trang chủ, thẻ meta, tìm kiếm). */
export function htmlToText(html: string): string {
  return sanitizeHtml(html.replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>|<br\s*\/?>/gi, "$& "), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
