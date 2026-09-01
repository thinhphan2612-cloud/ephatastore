import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { countTokens, type GeminiContent } from "@/lib/ai/gemini";
import {
  AI_MODEL,
  estimateMaxPoints,
  actualPoints,
  DEFAULT_MAX_OUTPUT_TOKENS,
} from "@/lib/ai/pricing";
import { adjustPoints, InsufficientPointsError } from "@/lib/ai/wallet-ops";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Proxy trong suốt cho AI Document Studio: nhận nguyên body Gemini generateContent,
 * gắn key server + ép model + trần output, đo token → trừ point, trả nguyên response.
 * Luồng point: HOLD giá tối đa → gọi Google → settle theo usage thực (hoàn dư / lỗi hoàn hết).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const key = process.env.GEMINI_API_KEY;
  if (!key)
    return NextResponse.json({ error: "Chưa cấu hình GEMINI_API_KEY." }, { status: 500 });

  let body: {
    contents?: GeminiContent[];
    systemInstruction?: GeminiContent;
    generationConfig?: Record<string, unknown>;
    [k: string]: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const contents = body.contents ?? [];
  if (!Array.isArray(contents) || contents.length === 0)
    return NextResponse.json({ error: "Thiếu nội dung." }, { status: 400 });

  // Ép trần output (gồm cả thinking) — không cho client vượt trần chi phí.
  const reqMax = Number(body.generationConfig?.maxOutputTokens);
  const maxOut = Math.min(
    Number.isFinite(reqMax) && reqMax > 0 ? reqMax : DEFAULT_MAX_OUTPUT_TOKENS,
    DEFAULT_MAX_OUTPUT_TOKENS
  );
  const forwardBody = {
    ...body,
    generationConfig: { ...(body.generationConfig ?? {}), maxOutputTokens: maxOut },
  };

  // 1) Ước lượng + HOLD
  const ref = crypto.randomUUID();
  const toCount = body.systemInstruction
    ? [...contents, { parts: body.systemInstruction.parts }]
    : contents;

  let hold: number;
  let inputTokens: number;
  try {
    inputTokens = await countTokens(toCount);
    hold = estimateMaxPoints(inputTokens, maxOut);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi ước lượng." },
      { status: 502 }
    );
  }

  try {
    await adjustPoints(user.id, -hold, "spend", ref, "AI hold");
  } catch (e) {
    if (e instanceof InsufficientPointsError)
      return NextResponse.json(
        { error: "Không đủ point.", needed: hold, code: "INSUFFICIENT_POINTS" },
        { status: 402 }
      );
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi trừ point." },
      { status: 500 }
    );
  }

  // 2) Forward tới Google (model bị ép về AI_MODEL)
  let googleRes: Response;
  let data: {
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      thoughtsTokenCount?: number;
    };
  };
  try {
    googleRes = await fetch(`${GEMINI_BASE}/models/${AI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(forwardBody),
    });
    data = await googleRes.json();
  } catch (e) {
    await adjustPoints(user.id, hold, "refund", ref, "AI hoàn (lỗi mạng)");
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi gọi model." },
      { status: 502 }
    );
  }

  // 3) Google trả lỗi → hoàn hết hold, trả nguyên lỗi cho app
  if (!googleRes.ok) {
    await adjustPoints(user.id, hold, "refund", ref, "AI hoàn (model lỗi)");
    return NextResponse.json(data, { status: googleRes.status });
  }

  // 4) Settle theo usage thực (output gồm thinking tokens)
  const u = data.usageMetadata ?? {};
  const realInput = u.promptTokenCount ?? inputTokens;
  const realOutput = (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
  const charged = actualPoints(realInput, realOutput);
  const refund = hold - charged;
  if (refund !== 0) {
    await adjustPoints(user.id, refund, refund > 0 ? "refund" : "spend", ref, "AI settle");
  }

  // Trả nguyên response Gemini để app parse như cũ.
  return NextResponse.json(data, { status: 200 });
}
