import type { Metadata } from "next";
import { ArrowLeft, Link } from "@/lib/imports";
import { CreateListingForm } from "@/lib/imports/screens";

export const metadata: Metadata = { title: "Item for sale" };

export default function CreateItemPage() {
  return (
    <main id="main-content" className="mx-auto max-w-[1140px] px-4 pt-7 pb-16 sm:px-6 sm:pt-10">
      <Link href="/create" className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-primary-strong hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to listing type
      </Link>
      <h1 className="mt-5 mb-6 font-display text-4xl font-medium tracking-tight sm:text-5xl">Item for sale</h1>
      <CreateListingForm />
    </main>
  );
}
