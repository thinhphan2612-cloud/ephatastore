"use client";

import { useActionState } from "react";
import { addGameToGiaoly, type AddGameState } from "@/lib/actions/giaoly-game";

export function AddToGiaolyButton({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState<AddGameState, FormData>(
    addGameToGiaoly,
    {}
  );

  if (state.ok) {
    return (
      <div className="w-full rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-center text-sm font-semibold text-success">
        ✓ Đã thêm vào Giáo Lý Số
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="product_id" value={productId} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl border border-border-strong bg-white/5 px-4 py-3 text-sm font-bold text-text hover:border-accent/50 disabled:opacity-60"
      >
        {pending ? "Đang thêm…" : "+ Thêm vào Giáo Lý Số"}
      </button>
      {state.error && <p className="mt-1 text-xs text-danger">{state.error}</p>}
    </form>
  );
}
