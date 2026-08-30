"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { applyDiscount, type DiscountState } from "@/lib/actions/checkout";

export function DiscountForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<DiscountState, FormData>(
    applyDiscount,
    {}
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="code"
          placeholder="Mã giảm giá"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm uppercase text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
        <input type="hidden" name="order_id" value={orderId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:border-accent/50 disabled:opacity-60"
        >
          {pending ? "…" : "Áp dụng"}
        </button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
