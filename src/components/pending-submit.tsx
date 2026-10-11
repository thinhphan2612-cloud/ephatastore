"use client";

import { useFormStatus } from "react-dom";

/**
 * Nút submit cho form server action: khi đang gửi thì khóa nút + đổi chữ (vd "Đang thanh toán…"),
 * tránh khách bấm lại / tưởng treo khi xử lý lâu (mua tính năng GLS có thể chờ đồng bộ vài giây).
 */
export function PendingSubmit({
  children,
  pendingText,
  className = "",
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} disabled:cursor-wait disabled:opacity-70`}>
      {pending ? pendingText : children}
    </button>
  );
}
