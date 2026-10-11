import { publicKeyBase64 } from "@/lib/software/license";
import { handleError, ok } from "@/lib/software/api";

export async function GET() {
  try {
    return ok({ publicKey: publicKeyBase64() });
  } catch (e) {
    return handleError(e, "public-key");
  }
}
