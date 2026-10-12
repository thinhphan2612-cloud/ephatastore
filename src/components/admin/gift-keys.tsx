"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGiftKey, resetGiftKeyDevices, setGiftKeyStatus } from "@/lib/actions/software";
import { unwrap } from "@/lib/action-result";
import type { GiftKey } from "@/data/software";

const input =
  "w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text focus:border-accent focus:outline-none";

/** Key tặng / key thử: tạo key không qua mua (người duyệt Microsoft Store, đối tác, tặng thành viên) + quản lý. */
export function GiftKeys({ productId, defaultDevices, keys }: { productId: string; defaultDevices: number; keys: GiftKey[] }) {
  const router = useRouter();
  const [note, setNote] = useState("Microsoft Store review");
  const [devices, setDevices] = useState(String(Math.max(defaultDevices, 2)));
  const [email, setEmail] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
      }
    });

  const copy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Không copy được — bôi đen key rồi Ctrl+C.");
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
      <div>
        <h3 className="font-semibold text-text">Key tặng / key thử</h3>
        <p className="mt-1 text-sm text-text-muted">
          Tạo key không qua mua — vd cho <b>người duyệt Microsoft Store</b> (dán vào “Notes for certification”), đối tác hoặc tặng
          thành viên. Không trừ point, không tính là đơn bán. Kích hoạt trong app giống key thường.
        </p>
      </div>

      <form
        className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_110px_minmax(0,1.2fr)_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setCreated(null);
          run(async () => {
            const r = unwrap(await createGiftKey({ productId, note, deviceLimit: Number(devices), email }));
            setCreated(r.key);
            setEmail("");
          });
        }}
      >
        <label className="block">
          <span className="mb-1 block text-xs text-text-muted">Ghi chú (bắt buộc — dùng cho ai, đợt nào)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} required className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-text-muted">Số thiết bị</span>
          <input type="number" min={1} max={20} value={devices} onChange={(e) => setDevices(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-text-muted">Gắn vào tài khoản (email, tùy chọn)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Trống = key rời, chỉ admin thấy"
            className={input}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Đang tạo…" : "Tạo key"}
        </button>
      </form>

      {error && <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {created && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm">
          <span className="text-text-muted">Key mới:</span>
          <code className="font-mono text-base font-bold text-text">{created}</code>
          <button type="button" onClick={() => copy(created)} className="text-sm font-semibold text-brand hover:text-brand-hover">
            {copied === created ? "Đã copy" : "Copy"}
          </button>
        </div>
      )}

      {keys.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-hover text-left text-xs text-text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Ghi chú</th>
                <th className="px-3 py-2 font-medium">Gắn vào</th>
                <th className="px-3 py-2 font-medium">Thiết bị</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-border align-middle">
                  <td className="px-3 py-2">
                    <code className="font-mono text-text">{k.key}</code>{" "}
                    <button type="button" onClick={() => copy(k.key)} className="text-xs text-brand hover:text-brand-hover">
                      {copied === k.key ? "Đã copy" : "Copy"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-text-muted">
                    {k.note}
                    <span className="block text-[11px] text-text-faint">{new Date(k.createdAt).toLocaleDateString("vi-VN")}</span>
                  </td>
                  <td className="px-3 py-2 text-text-muted">{k.ownerEmail ?? <span className="text-text-faint">Key rời</span>}</td>
                  <td className="px-3 py-2 tabular-nums text-text-muted">
                    {k.devicesUsed} / {k.deviceLimit}
                  </td>
                  <td className="px-3 py-2">
                    <span className={k.status === "active" ? "text-success" : "text-danger"}>
                      {k.status === "active" ? "Đang dùng được" : "Đã khóa"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs">
                    {k.devicesUsed > 0 && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => confirm(`Gỡ ${k.devicesUsed} thiết bị khỏi key ${k.key}?`) && run(async () => void unwrap(await resetGiftKeyDevices(k.id)))}
                        className="mr-3 text-text-muted hover:text-text disabled:opacity-50"
                      >
                        Gỡ thiết bị
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        (k.status !== "active" || confirm(`Khóa key ${k.key}? App đang dùng key này sẽ về bản miễn phí ở lần kiểm tiếp theo.`)) &&
                        run(async () => void unwrap(await setGiftKeyStatus(k.id, k.status !== "active")))
                      }
                      className={k.status === "active" ? "text-text-faint hover:text-danger" : "text-brand hover:text-brand-hover"}
                    >
                      {k.status === "active" ? "Khóa" : "Mở lại"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-text-faint">
        Mọi thao tác được ghi Nhật ký admin (key che giữa). Key tặng cho người duyệt: tạo riêng mỗi đợt nộp, duyệt xong bấm Khóa.
      </p>
    </section>
  );
}
