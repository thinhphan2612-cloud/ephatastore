import "server-only";
import { AI_MODEL } from "@/lib/ai/pricing";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

function apiKey(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("Chưa cấu hình GEMINI_API_KEY.");
  return k;
}

export interface GeminiContent {
  role?: string;
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[];
}

export interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}

/** Đếm token của input (không tốn quota generate). */
export async function countTokens(contents: GeminiContent[]): Promise<number> {
  const res = await fetch(`${BASE}/models/${AI_MODEL}:countTokens`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey() },
    body: JSON.stringify({ contents }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `countTokens lỗi ${res.status}`);
  return Number(data.totalTokens ?? 0);
}

export interface GenerateResult {
  text: string;
  usage: GeminiUsage;
  /** token output tính tiền = candidates + thinking. */
  billedOutputTokens: number;
  raw: unknown;
}

/** Gọi generateContent. Trả text + usage. Ném lỗi nếu API lỗi. */
export async function generateContent(opts: {
  contents: GeminiContent[];
  systemInstruction?: GeminiContent;
  maxOutputTokens: number;
}): Promise<GenerateResult> {
  const body: Record<string, unknown> = {
    contents: opts.contents,
    generationConfig: { maxOutputTokens: opts.maxOutputTokens },
  };
  if (opts.systemInstruction) body.systemInstruction = opts.systemInstruction;

  const res = await fetch(`${BASE}/models/${AI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `generateContent lỗi ${res.status}`);

  const usage: GeminiUsage = data.usageMetadata ?? {};
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: { text?: string }) => p.text ?? "").join("");
  const billedOutputTokens =
    (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);

  return { text, usage, billedOutputTokens, raw: data };
}
