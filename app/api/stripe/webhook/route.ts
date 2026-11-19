import type Stripe from "stripe";
import { ApiError, apiFailure, apiJson } from "@/lib/marketplace-server";
import { recordCheckoutEvent } from "@/lib/payments/checkout";
import { stripeClient } from "@/lib/payments/config";
import { refreshSellerAccount } from "@/lib/payments/seller-account";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret?.startsWith("whsec_")) throw new ApiError(503, "Stripe webhooks are unavailable.");
    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new ApiError(400, "Missing Stripe signature.");
    const stripe = stripeClient();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
    } catch {
      throw new ApiError(400, "Invalid Stripe signature.");
    }

    if (event.livemode || !event.account) return apiJson({ received: true });
    switch (event.type) {
      case "account.updated": {
        if (event.data.object.id !== event.account) break;
        const { data, error } = await createSupabaseServerClient().from("seller_payment_accounts")
          .select("stripe_account_id").eq("stripe_account_id", event.account).maybeSingle();
        if (error) throw error;
        if (data) await refreshSellerAccount(event.account, stripe);
        break;
      }
      case "checkout.session.completed":
      case "checkout.session.expired":
        await recordCheckoutEvent(stripe, event.account, event.data.object, event.type === "checkout.session.expired");
        break;
    }
    return apiJson({ received: true });
  } catch (error) {
    return apiFailure(error, "Couldn’t process the Stripe webhook.");
  }
}
