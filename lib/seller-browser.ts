import "server-only";
import { createHash, randomBytes } from "node:crypto";

const cookieName = "marketplace_seller";

export function sellerBrowser(request: Request) {
  const saved = request.headers.get("cookie")?.match(/(?:^|;\s*)marketplace_seller=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1];
  const token = saved ?? randomBytes(32).toString("base64url");
  return { token, hash: createHash("sha256").update(token).digest("hex"), hasCookie: Boolean(saved) };
}

export function rememberSeller(request: Request, response: Response, seller = sellerBrowser(request)) {
  if (!seller.hasCookie) {
    const secure = new URL(request.url).protocol === "https:" || process.env.VERCEL === "1";
    response.headers.append("Set-Cookie", `${cookieName}=${seller.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure ? "; Secure" : ""}`);
  }
  return response;
}
