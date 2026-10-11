import { type NextRequest } from "next/server";
import { getSoftwareProduct, latestReleases } from "@/data/software";
import { fail, handleError, ok } from "@/lib/software/api";
import { isPlatform } from "@/lib/software/version";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const platform = request.nextUrl.searchParams.get("platform");
  if (!isPlatform(platform)) return fail("BAD_REQUEST", 400);
  try {
    const product = await getSoftwareProduct(slug);
    const release = product ? (await latestReleases(product.id))[platform] : undefined;
    if (!product || !release) return fail("NO_RELEASE");
    const site = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    return ok({
      version: release.version,
      notes: release.notes,
      publishedAt: release.created_at,
      pageUrl: `${site.replace(/\/$/, "")}/product/${product.slug}`,
    });
  } catch (e) {
    return handleError(e, "latest");
  }
}
