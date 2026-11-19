import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Card, Link, Tag } from "@/lib/imports";

export const metadata: Metadata = { title: "Create a listing" };

export default function CreatePage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-4 pt-7 pb-20 sm:px-6 sm:pt-12">
      <Link href="/" className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-primary-strong hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to marketplace
      </Link>
      <h1 className="mt-6 font-display text-4xl font-medium tracking-tight sm:text-5xl">Create a listing</h1>
      <p className="mt-2 text-muted-foreground">Choose what you’d like to sell.</p>
      <Card className="mt-7 gap-0 p-0 shadow-none transition-colors hover:border-primary/40">
        <Link href="/create/item" className="flex items-center gap-4 rounded-xl p-5 sm:p-6">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-primary">
            <Tag aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Item for sale</span>
            <span className="mt-1 block text-sm text-muted-foreground">Furniture, electronics, clothing, and more.</span>
          </span>
          <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-primary" />
        </Link>
      </Card>
    </main>
  );
}
