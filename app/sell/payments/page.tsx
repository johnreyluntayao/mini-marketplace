import { Suspense } from "react";
import { Link } from "@/lib/imports";
import { SellerPayments } from "@/lib/imports/screens";
import { isEmail } from "@/lib/listings";

export const metadata = { title: "Seller payments" };

async function PaymentForm({ searchParams }: Pick<PageProps<"/sell/payments">, "searchParams">) {
  const { email, retry } = await searchParams;
  const address = typeof email === "string" && isEmail(email) ? email : "";
  return <SellerPayments key={address} initialEmail={address} retry={retry === "1"} />;
}

export default function SellerPaymentsPage({ searchParams }: PageProps<"/sell/payments">) {
  return (
    <main id="main-content" className="mx-auto max-w-xl space-y-5 px-4 py-10 sm:px-6">
      <Link href="/create" className="rounded text-sm font-semibold text-primary-strong hover:underline">Back to selling</Link>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Seller payments</h1>
        <p className="text-muted-foreground">Connect Stripe to accept test payments on listings you publish in this browser. Use the same seller email on your listings.</p>
      </div>
      <Suspense fallback={<p role="status">Loading seller payments…</p>}>
        <PaymentForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
