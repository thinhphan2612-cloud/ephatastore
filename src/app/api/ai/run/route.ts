import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBalance } from "@/data/wallet";
import { countTokens, generateContent, type GeminiContent } from "@/lib/ai/gemini";
import {
  estimateMaxPoints,
  actualPoints,
  DEFAULT_MAX_OUTPUT_TOKENS,
} from "@/lib/ai/pricing";
import { adjustPoints, InsufficientPointsError } from "@/lib/ai/wallet-ops";

/**
 * Chạy 1 lần AI, trừ point theo usage thực.
 * Luồng: đếm input → HOLD giá tối đa → gọi Gemini → hoàn phần dư (settle).
 * Body: { contents, systemInstruction?, maxOutputTokens? }
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  let body: {
    contents?: GeminiContent[];
    systemInstruction?: GeminiContent;
    maxOutputTokens?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const contents = body.contents ?? [];
  if (!Array.isArray(contents) || contents.length === 0)
    return NextResponse.json({ error: "Thiếu nội dung." }, { status: 400 });

  const maxOut = Math.min(
    Math.max(1, body.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS),
    DEFAULT_MAX_OUTPUT_TOKENS
  );

  const ref = crypto.randomUUID();
  const toCount = body.systemInstruction
    ? [...contents, { parts: body.systemInstruction.parts }]
    : contents;

  // 1) Đếm input + tính giá tối đa
  let inputTokens: number;
  let hold: number;
  try {
    inputTokens = await countTokens(toCount);
    hold = estimateMaxPoints(inputTokens, maxOut);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi ước lượng." },
      { status: 502 }
    );
  }

  // 2) HOLD (trừ tạm giá tối đa)
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

  // 3) Gọi Gemini — nếu lỗi thì hoàn lại toàn bộ hold
  let result;
  try {
    result = await generateContent({
      contents,
      systemInstruction: body.systemInstruction,
      maxOutputTokens: maxOut,
    });
  } catch (e) {
    await adjustPoints(user.id, hold, "refund", ref, "AI hoàn (lỗi gọi model)");
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi gọi model." },
      { status: 502 }
    );
  }

  // 4) Settle: tính giá thực rồi hoàn phần dư
  const realInput = result.usage.promptTokenCount ?? inputTokens;
  const charged = actualPoints(realInput, result.billedOutputTokens);
  const refund = hold - charged;
  let balance: number;
  if (refund !== 0) {
    balance = await adjustPoints(
      user.id,
      refund,
      refund > 0 ? "refund" : "spend",
      ref,
      "AI settle"
    );
  } else {
    balance = await getBalance(user.id);
  }

  return NextResponse.json({
    text: result.text,
    usage: result.usage,
    pointsCharged: charged,
    balance,
  });
}
