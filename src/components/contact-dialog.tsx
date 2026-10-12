"use client";

import { useRef, useState } from "react";
import { ContactForm } from "@/components/contact-form";

/** Nút mở form liên hệ dạng popup (không rời trang). Trang /lien-he vẫn giữ cho các link khác. */
export function ContactDialog({
  label,
  value,
  className,
  defaultEmail,
}: {
  label: string;
  value: string;
  className: string;
  defaultEmail?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Mỗi lần mở dựng lại form → gửi xong mở lại là form trống.
  const [round, setRound] = useState(0);
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setRound((n) => n + 1);
          ref.current?.showModal();
        }}
        className={`${className} w-full text-left`}
      >
        <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-text-muted">{label}</span>
        <b className="text-base">{value}</b>
      </button>

      <dialog
        ref={ref}
        aria-labelledby="contact-dialog-title"
        // Bấm ra vùng tối bên ngoài khung → đóng.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto w-[min(640px,calc(100%-32px))] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-2xl border border-border bg-bg-elevated p-0 text-text shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id="contact-dialog-title" className="text-xl font-bold">
                Liên hệ Ephata Store
              </h2>
              <p className="mt-1 text-sm text-text-muted">Hỗ trợ nạp point, mua hàng, tài khoản, hoặc đề xuất / hợp tác. Chúng tôi trả lời qua email.</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Đóng"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-text-muted hover:border-accent/50 hover:text-text"
            >
              ✕
            </button>
          </div>
          {round > 0 && <ContactForm key={round} defaultEmail={defaultEmail} onDone={close} />}
        </div>
      </dialog>
    </>
  );
}
