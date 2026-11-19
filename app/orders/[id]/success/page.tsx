import { Suspense } from "react";
import { notFound } from "next/navigation";
import { OrderConfirmation } from "@/lib/imports/screens";
import { isUuid } from "@/lib/listings";
import { isSandboxCheckoutId } from "@/lib/payments/types";

export const metadata = { title: "Order confirmation", robots: { index: false, follow: false } };

async function Receipt({ params, searchParams }: PageProps<"/orders/[id]/success">) {
  const [{ id }, { session_id: session }] = await Promise.all([params, searchParams]);
  if (!isUuid(id) || !isSandboxCheckoutId(session)) notFound();
  return <OrderConfirmation orderId={id} sessionId={session} />;
}

export default function OrderSuccessPage(props: PageProps<"/orders/[id]/success">) {
  return (
    <main id="main-content" className="mx-auto max-w-xl px-4 py-12">
      <Suspense fallback={<p className="text-center" role="status">Loading order…</p>}>
        <Receipt {...props} />
      </Suspense>
    </main>
  );
}
