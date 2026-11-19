import "server-only";
import type Stripe from "stripe";
import type { Tables } from "@/lib/database.types";
import { isUuid } from "@/lib/listings";
import { ApiError } from "@/lib/marketplace-server";
import { createSupabaseServerClient } from "@/lib/supabase";

type Order = Tables<"orders">;
const orderMetadata = "marketplace_order_id";

async function reserveOrder(listingId: string, orderId: string) {
  const { data, error } = await createSupabaseServerClient()
    .rpc("reserve_marketplace_order", { p_listing_id: listingId, p_order_id: orderId }).single<Order>();
  if (error?.message === "listing_unavailable") throw new ApiError(409, "This listing is sold or unavailable.");
  if (error?.message === "listing_not_purchasable") throw new ApiError(409, "This listing doesn’t accept online payments.");
  if (error?.code === "23505") throw new ApiError(409, "This checkout expired. Try again to open a new checkout.");
  if (error) throw error;
  return data;
}

async function expireOrder(order: Order) {
  if (!order.stripe_checkout_id) return;
  const { error } = await createSupabaseServerClient().from("orders").update({ status: "expired" })
    .eq("id", order.id).eq("stripe_checkout_id", order.stripe_checkout_id).eq("status", "pending");
  if (error) throw error;
}

export async function openCheckout(stripe: Stripe, origin: string, listingId: string, orderId: string) {
  let order = await reserveOrder(listingId, orderId);
  if (order.id !== orderId && order.stripe_checkout_id && Date.parse(order.expires_at) <= Date.now()) {
    const expired = await stripe.checkout.sessions.retrieve(order.stripe_checkout_id, {}, { stripeAccount: order.stripe_account_id });
    if (expired.status === "expired") {
      await expireOrder(order);
      order = await reserveOrder(listingId, orderId);
    }
  }
  if (order.id !== orderId) throw new ApiError(409, "Another buyer has opened Checkout for this item. Try again later.");

  const receipt = `${origin}/orders/${orderId}/success?session_id=`;
  const stripeAccount = order.stripe_account_id;
  if (order.stripe_checkout_id) {
    const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_id, {}, { stripeAccount });
    if (session.status === "complete") return receipt + session.id;
    if (session.status === "open" && session.url) return session.url;
    if (session.status === "expired") await expireOrder(order);
    throw new ApiError(409, "This checkout expired. Try again to open a new checkout.");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    allowed_payment_method_types: ["card"],
    line_items: [{
      quantity: 1,
      price_data: { currency: order.currency, unit_amount: order.amount_cents, product_data: { name: order.title } },
    }],
    payment_intent_data: { application_fee_amount: order.platform_fee_cents },
    metadata: { [orderMetadata]: order.id },
    expires_at: Math.floor(Date.parse(order.expires_at) / 1000),
    success_url: receipt + "{CHECKOUT_SESSION_ID}",
    cancel_url: `${origin}/item/${listingId}`,
  }, { stripeAccount, idempotencyKey: `marketplace-checkout-${order.id}` });

  if (session.livemode || !session.url) throw new Error("Stripe did not return a sandbox Checkout URL");
  const { data, error } = await createSupabaseServerClient().from("orders")
    .update({ stripe_checkout_id: session.id }).eq("id", order.id).eq("status", "pending").select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(409, "This checkout is no longer available. Try again.");
  return session.url;
}

export async function recordCheckoutEvent(stripe: Stripe, accountId: string, session: Stripe.Checkout.Session, expired: boolean) {
  const orderId = session.metadata?.[orderMetadata];
  if (session.livemode || !orderId || !isUuid(orderId)) return;
  const supabase = createSupabaseServerClient();
  const { data: order, error } = await supabase.from("orders").select("*")
    .eq("id", orderId).eq("stripe_account_id", accountId).eq("stripe_checkout_id", session.id).maybeSingle();
  if (error) throw error;
  if (!order || order.status !== "pending") return;

  if (expired) {
    if (session.status === "expired") await expireOrder(order);
    return;
  }

  const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (session.payment_status !== "paid" || !intentId || session.currency !== order.currency || session.amount_total !== order.amount_cents) return;
  const payment = await stripe.paymentIntents.retrieve(intentId, {}, { stripeAccount: accountId });
  if (payment.livemode || payment.status !== "succeeded" || payment.currency !== order.currency ||
    payment.amount_received !== order.amount_cents || (payment.application_fee_amount ?? 0) !== order.platform_fee_cents) return;

  const completed = await supabase.rpc("confirm_marketplace_order", {
    p_order_id: order.id,
    p_checkout_id: session.id,
    p_account_id: accountId,
    p_intent_id: payment.id,
    p_amount: payment.amount_received,
    p_fee: payment.application_fee_amount ?? 0,
  });
  if (completed.error) throw completed.error;
}
