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
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ephata Store — Sắp ra mắt</title><link rel="icon" href="/icon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"><link rel="stylesheet" href="https://db.onlinewebfonts.com/c/04e6981992c0e2e7642af2074ebe3901?family=Helvetica+Now+Display+Bold"><style>
:root{--font-heading:'Helvetica Now Display Bold','Inter',sans-serif;--font-body:'Inter',sans-serif;--color-text:#192837;--color-accent:#7342E2;--color-login-bg:#F2F2EE}
*{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100%}
body{font-family:var(--font-body);color:var(--color-text);position:relative;min-height:100vh;min-height:100dvh;overflow-x:hidden;background:var(--color-login-bg)}
.bgvid{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
.scrim{position:fixed;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(242,242,238,.95) 0%,rgba(242,242,238,.78) 42%,rgba(242,242,238,.34) 100%)}
.wrap{max-width:1280px;margin:0 auto;padding:0 20px}
@media(min-width:640px){.wrap{padding:0 32px}}
.nav{position:relative;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:16px 0}
@media(min-width:640px){.nav{padding:20px 0}}
.nav img{height:34px;width:auto;display:block}
.hero{position:relative;z-index:5;padding-top:clamp(40px,8vw,72px);padding-bottom:64px}
.heroin{max-width:560px}
.badge{display:inline-block;border:1px solid rgba(115,66,226,.3);background:rgba(115,66,226,.08);color:var(--color-accent);padding:8px 14px;border-radius:9999px;font-size:11px;letter-spacing:.14em;font-weight:700;text-transform:uppercase;margin-bottom:22px;opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
h1{font-family:var(--font-heading);font-size:clamp(1.9rem,5.5vw,3.2rem);line-height:1.05;letter-spacing:-.01em;color:var(--color-text);margin-bottom:22px;opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .15s forwards}
.sub{font-size:clamp(.9rem,2.5vw,1.1rem);line-height:1.65;opacity:0;max-width:560px;color:#324556;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .3s forwards}
.soon{margin-top:34px;font-family:var(--font-heading);font-size:clamp(1.15rem,3vw,1.6rem);font-weight:700;color:var(--color-accent);letter-spacing:.02em;opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .45s forwards}
@keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
</style></head><body>
<video class="bgvid" autoplay muted loop playsinline><source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260518_003132_8b7edcb6-c64d-4a52-a9ca-879942e122ad.mp4" type="video/mp4"></video>
<div class="scrim"></div>
<div class="wrap">
<nav class="nav"><img src="/logo.png" alt="Ephata Store"></nav>
<section class="hero"><div class="heroin">
<span class="badge">● Sắp ra mắt</span>
<h1>Kho công cụ số cho cộng đồng Công giáo — sắp mở ra.</h1>
<p class="sub">Ephata Store gom ứng dụng, biểu mẫu, thiết kế, tài liệu và game giáo lý về một nơi — dễ tìm, dễ dùng, dễ triển khai cho giáo xứ và cộng đoàn. Chúng tôi đang hoàn thiện những khâu cuối.</p>
<div class="soon">Coming soon</div>
</div></section>
</div>
</body></html>`;
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
