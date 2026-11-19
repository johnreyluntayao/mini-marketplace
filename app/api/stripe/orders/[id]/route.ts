import { ApiError, apiFailure, apiJson, requireId } from "@/lib/marketplace-server";
import { isSandboxCheckoutId, type OrderReceipt } from "@/lib/payments/types";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: Request, { params }: RouteContext<"/api/stripe/orders/[id]">) {
  try {
    const id = requireId((await params).id, "Invalid order ID.");
    const session = new URL(request.url).searchParams.get("session_id");
    if (!isSandboxCheckoutId(session)) throw new ApiError(404, "This order is unavailable.");
    const { data: order, error } = await createSupabaseServerClient().from("orders")
      .select("listing_id,title,amount_cents,status").eq("id", id).eq("stripe_checkout_id", session).maybeSingle();
    if (error) throw error;
    if (!order) throw new ApiError(404, "This order is unavailable.");
    const { status } = order;
    if (status !== "pending" && status !== "paid" && status !== "expired") throw new Error("Unexpected marketplace order status.");
    return apiJson({ listingId: order.listing_id, title: order.title, amountCents: order.amount_cents, status } satisfies OrderReceipt);
  } catch (error) {
    return apiFailure(error, "Couldn’t load the order right now.");
  }
}
