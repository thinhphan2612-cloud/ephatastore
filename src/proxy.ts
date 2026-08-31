import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * - COMING_SOON bật (Production) → toàn site hiện trang "Sắp ra mắt".
 * - Không bật (nhánh test / local) → chạy full store + refresh session.
 * Next 16: file convention "proxy".
 */
export async function proxy(request: NextRequest) {
  const cs = process.env.COMING_SOON;
  if (cs === "1" || cs === "true") {
    return comingSoon();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_STORE_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_STORE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

function comingSoon() {
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ephata Store — Sắp ra mắt</title><link rel="icon" href="/icon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&family=Lora:wght@600&display=swap" rel="stylesheet"><style>
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{background:radial-gradient(circle at 70% 0,rgba(70,106,125,.18),transparent 30rem),radial-gradient(circle at 10% 25%,rgba(196,151,54,.1),transparent 25rem),#07090b;color:#f7f4ec;font-family:"Be Vietnam Pro",system-ui,sans-serif;display:grid;place-items:center;text-align:center;padding:24px}
body:before{content:"";position:fixed;inset:0;z-index:-1;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:36px 36px;mask-image:linear-gradient(#000,transparent 80%)}
.wrap{max-width:560px}
img{width:min(300px,72vw);height:auto;margin-bottom:34px}
.badge{display:inline-block;border:1px solid #e0bf6538;background:#e0bf650c;color:#f0d98f;padding:9px 15px;border-radius:99px;font-size:11px;letter-spacing:.16em;font-weight:800;text-transform:uppercase}
h1{font-family:"Lora",Georgia,serif;font-weight:600;font-size:clamp(34px,7vw,52px);letter-spacing:-.02em;margin:22px 0 14px}
p{color:#ffffff8c;line-height:1.7;font-size:16px;margin:0 auto;max-width:440px}
.foot{margin-top:40px;color:#ffffff55;font-size:13px}
</style></head><body><div class="wrap"><img src="/logo.png" alt="Ephata Store"><div><span class="badge">● Sắp ra mắt</span></div><h1>Điều tuyệt vời đang đến.</h1><p>Ephata Store — kho công cụ số cho cộng đồng Công giáo: web app, biểu mẫu, thiết kế, tài liệu và game giáo lý. Chúng tôi đang hoàn thiện những khâu cuối.</p><div class="foot">© 2026 Ephata Store · hello@ephata.vn</div></div></body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
