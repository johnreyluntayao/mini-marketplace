import { ApiError, apiFailure, apiJson, messageInput, readJson, requireAdmin, requireId } from "@/lib/marketplace-server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const listingId = requireId(params.get("listingId"), "A valid listing ID is required.");
    const page = Number(params.get("page") ?? "1");
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new ApiError(400, "Invalid message page.");
    const offset = (page - 1) * 100;
    const { data, error } = await createSupabaseServerClient().from("messages")
      .select("id,listing_id,buyer_email,message,created_at").eq("listing_id", listingId)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 100);
    if (error) throw error;
    return apiJson({ messages: data.slice(0, 100), nextPage: data.length > 100 ? page + 1 : null });
  } catch (error) {
    return apiFailure(error, "Couldn’t load messages. Please try again.");
  }
}

export async function POST(request: Request) {
  try {
    const input = messageInput(await readJson(request));
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("messages").insert(input);
    if (!error) return apiJson({ id: input.id }, 201);
    if (error.code === "23503") throw new ApiError(404, "This listing is unavailable.");
    if (error.code !== "23505") throw error;

    const existing = await supabase.from("messages").select("listing_id,buyer_email,message").eq("id", input.id).single();
    if (existing.error) throw existing.error;
    const saved = existing.data;
    if (saved.listing_id !== input.listing_id || saved.buyer_email !== input.buyer_email || saved.message !== input.message) {
      throw new ApiError(409, "This message was already saved. Close the form and try again.");
    }
    return apiJson({ id: input.id });
  } catch (error) {
    return apiFailure(error, "Couldn’t save your message. Please try again.");
  }
}
