"use client";

import { useActionState, useState } from "react";
import { createTopup, type TopupState } from "@/lib/actions/wallet";
import { TOPUP_PRESETS, vndToPoints } from "@/lib/points";

export function TopupForm() {
  const [state, formAction, pending] = useActionState<TopupState, FormData>(
    createTopup,
    {}
  );
  const [amount, setAmount] = useState<number>(TOPUP_PRESETS[1]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="amount_vnd" value={amount} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TOPUP_PRESETS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setAmount(v)}
            className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
              amount === v
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-text-muted hover:border-accent/50"
            }`}
          >
            {v.toLocaleString("vi-VN")}đ
          </button>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">Hoặc nhập số tiền (VND)</span>
        <input
          type="number"
          min={10000}
          step={10000}
          value={amount}
          onChange={(e) => setAmount(Math.floor(Number(e.target.value)))}
          className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-text focus:border-accent focus:outline-none"
        />
      </label>

      <p className="rounded-md bg-bg-elevated px-3 py-2 text-sm text-text-muted">
        Nhận được:{" "}
        <strong className="text-text">{vndToPoints(amount || 0).toLocaleString("vi-VN")} point</strong>{" "}
        <span className="text-text-faint">(100đ = 1 point)</span>
      </p>

      {state.error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-5 py-3 font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Đang tạo…" : "Tạo mã nạp →"}
      </button>
    </form>
  );
}
