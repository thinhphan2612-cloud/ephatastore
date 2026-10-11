/**
 * Server action gọi từ client (await action()) mà `throw` → ở production Next che thông điệp thành câu tiếng Anh chung
 * ("An error occurred in the Server Components render…"). Bọc bằng attempt() để TRẢ lỗi về; client dùng unwrap()
 * để ném lại đúng câu tiếng Việt (catch sẵn có hiển thị err.message).
 */
export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: string };

export async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    console.error("action", e);
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Có lỗi xảy ra. Thử lại sau ít phút." };
  }
}

export function unwrap<T>(r: ActionResult<T>): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}
