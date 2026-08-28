"use client";

export function DeleteButton({ title }: { title: string }) {
  return (
    <button
      type="submit"
      className="text-danger hover:underline"
      onClick={(e) => {
        if (!confirm(`Xoá "${title}"? Hành động này không hoàn tác.`)) {
          e.preventDefault();
        }
      }}
    >
      Xoá
    </button>
  );
}
