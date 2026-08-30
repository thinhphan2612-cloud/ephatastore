"use client";

export function ConfirmSubmit({
  confirm: confirmText,
  children,
  className = "",
}: {
  confirm: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
