import { refreshLicense } from "@/data/software";
import { fail, handleError, ok, readBody } from "@/lib/software/api";

export async function POST(request: Request) {
  const body = await readBody(request, ["product", "licenseToken", "deviceId"], ["appVersion"]);
  if (!body) return fail("BAD_REQUEST", 400);
  try {
    const licenseToken = await refreshLicense(body);
    return ok({ licenseToken });
  } catch (e) {
    return handleError(e, "refresh");
  }
}
