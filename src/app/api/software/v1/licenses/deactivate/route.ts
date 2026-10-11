import { deactivateLicense } from "@/data/software";
import { fail, handleError, ok, readBody } from "@/lib/software/api";

export async function POST(request: Request) {
  const body = await readBody(request, ["product", "licenseToken", "deviceId"]);
  if (!body) return fail("BAD_REQUEST", 400);
  try {
    await deactivateLicense(body);
    return ok();
  } catch (e) {
    return handleError(e, "deactivate");
  }
}
