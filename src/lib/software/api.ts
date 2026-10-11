import "server-only";
import { NextResponse } from "next/server";
import { LicenseError } from "@/lib/software/license";

/**
 * Helper cho API /api/software/v1. Lỗi nghiệp vụ: HTTP 200 {ok:false,error}; body sai: 400 BAD_REQUEST.
 * (Method sai → Next tự trả 405 vì route chỉ export handler cần thiết.)
 */

export function ok(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data });
}

export function fail(error: string, status = 200) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Đọc body JSON, bắt buộc các field là chuỗi không rỗng. null = body sai. */
export async function readBody<K extends string>(
  request: Request,
  required: K[],
  optional: string[] = []
): Promise<(Record<K, string> & Record<string, string | undefined>) | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  if (!body || typeof body !== "object") return null;
  const src = body as Record<string, unknown>;
  const out: Record<string, string | undefined> = {};
  for (const k of required) {
    const v = src[k];
    if (typeof v !== "string" || !v.trim() || v.length > 4096) return null;
    out[k] = v.trim();
  }
  for (const k of optional) {
    const v = src[k];
    out[k] = typeof v === "string" && v.length <= 256 ? v.trim() : undefined;
  }
  return out as Record<K, string> & Record<string, string | undefined>;
}

/** LicenseError → {ok:false, error:CODE}; lỗi khác → 500. */
export function handleError(e: unknown, where: string) {
  if (e instanceof LicenseError) return fail(e.code);
  console.error(`software api ${where}`, e);
  return fail("SERVER_ERROR", 500);
}
