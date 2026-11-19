import { ApiError, apiFailure, apiJson, requireId } from "@/lib/marketplace-server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: Request, { params }: RouteContext<"/api/stripe/orders/[id]">) {
  try {
    const id = requireId((await params).id, "Invalid order ID.");
    const session = new URL(request.url).searchParams.get("session_id") ?? "";
    if (!/^cs_test_[A-Za-z0-9]{1,200}$/.test(session)) throw new ApiError(404, "This order is unavailable.");
    const { data: order, error } = await createSupabaseServerClient().from("orders")
      .select("listing_id,title,amount_cents,status").eq("id", id).eq("stripe_checkout_id", session).maybeSingle();
    if (error) throw error;
    if (!order) throw new ApiError(404, "This order is unavailable.");
    return apiJson({ listingId: order.listing_id, title: order.title, amountCents: order.amount_cents, status: order.status });
  } catch (error) {
    return apiFailure(error, "Couldn’t load the order right now.");
  }
}
