"use client";

import { Button, CircleAlert, Link } from "@/lib/imports";

export default function MarketplaceError({ retry }: { retry: () => void }) {
  return (
    <main id="main-content" className="mx-auto grid max-w-xl justify-items-center gap-4 px-6 py-24 text-center">
      <CircleAlert aria-hidden="true" className="size-8 text-destructive" />
      <h1 className="font-display text-4xl font-medium tracking-tight">Something went wrong</h1>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={retry}>Try again</Button>
        <Button asChild variant="outline"><Link href="/">Browse marketplace</Link></Button>
      </div>
    </main>
  );
}
