import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBalance } from "@/data/wallet";
import { countTokens, type GeminiContent } from "@/lib/ai/gemini";
import { estimateMaxPoints, DEFAULT_MAX_OUTPUT_TOKENS } from "@/lib/ai/pricing";

/**
 * Ước lượng giá (point) tối đa cho 1 lần chạy, để user xác nhận trước.
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

  // Đếm cả systemInstruction để estimate không thấp hơn thực tế.
  const toCount = body.systemInstruction
    ? [...contents, { parts: body.systemInstruction.parts }]
    : contents;

  try {
    const inputTokens = await countTokens(toCount);
    const estimatePoints = estimateMaxPoints(inputTokens, maxOut);
    const balance = await getBalance(user.id);
    return NextResponse.json({
      inputTokens,
      maxOutputTokens: maxOut,
      estimatePoints,
      balance,
      enough: balance >= estimatePoints,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi ước lượng." },
      { status: 502 }
    );
  }
}
