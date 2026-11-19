export type SellerPaymentStatus = "not_connected" | "incomplete" | "pending" | "ready" | "disconnected";

export type OrderReceipt = {
  listingId: string;
  title: string;
  amountCents: number;
  status: "pending" | "paid" | "expired";
};

export function isSandboxCheckoutId(value: unknown): value is string {
  return typeof value === "string" && /^cs_test_[A-Za-z0-9]{1,200}$/.test(value);
}
