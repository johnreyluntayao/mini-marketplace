import { findSellerAccount, sellerEmail, sellerOnboardingUrl } from "@/lib/payments/seller-account";
import { sellerBrowser } from "@/lib/seller-browser";

export async function GET(request: Request) {
  const retry = new URL("/sell/payments?retry=1", request.url);
  try {
    const email = sellerEmail(new URL(request.url).searchParams.get("email"));
    retry.searchParams.set("email", email);
    const seller = sellerBrowser(request);
    const account = seller.hasCookie ? await findSellerAccount(seller.hash, email) : undefined;
    if (account) {
      const url = await sellerOnboardingUrl(request, email, account);
      return new Response(null, { status: 303, headers: { Location: url, "Cache-Control": "no-store" } });
    }
  } catch {
    // The seller can request a fresh link on the payments page.
  }
  return new Response(null, {
    status: 303,
    headers: { Location: retry.pathname + retry.search, "Cache-Control": "no-store" },
  });
}
