"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitContact, type ContactState } from "@/lib/actions/contact";
import { CONTACT_TOPICS } from "@/lib/contact-topics";

const input =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none";

export function ContactForm({
  defaultEmail,
  defaultTopic,
  defaultMessage,
}: {
  defaultEmail?: string;
  defaultTopic?: string;
  defaultMessage?: string;
}) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(submitContact, {});
  // Gửi lỗi (thiếu tên, nội dung ngắn…) → React reset form; điền lại giá trị vừa nhập từ state.
  const v = state.values;

  if (state.ok) {
    return (
      <div className="space-y-3 text-center">
        <p className="font-medium text-success">Đã gửi. Cảm ơn bạn!</p>
        <p className="text-sm text-text-muted">Chúng tôi sẽ trả lời qua email bạn đã nhập, thường trong giờ làm việc.</p>
        <Link href="/" className="inline-block text-sm text-accent hover:text-accent-hover">
          ← Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Ô bẫy chống bot — người dùng không thấy. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-text-muted">Họ tên *</span>
          <input name="name" required maxLength={100} autoComplete="name" defaultValue={v?.name} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-text-muted">Email để nhận trả lời *</span>
          <input name="email" type="email" required defaultValue={v?.email ?? defaultEmail} autoComplete="email" className={input} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">Chủ đề</span>
        <select name="topic" defaultValue={v?.topic ?? defaultTopic ?? "Khác"} className={input}>
          {CONTACT_TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">Nội dung *</span>
        <textarea
          name="message"
          required
          rows={6}
          maxLength={5000}
          defaultValue={v?.message ?? defaultMessage}
          placeholder="Mô tả vấn đề hoặc đề xuất. Liên quan nạp point thì ghi kèm mã nạp (vd NAP3F9A1C0E)."
          className={input}
        />
      </label>
      {state.error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Đang gửi…" : "Gửi"}
      </button>
    </form>
  );
}
