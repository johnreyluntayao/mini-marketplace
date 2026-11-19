import { ArrowLeft, Button, Link, PackageSearch } from "@/lib/imports";

export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto grid max-w-xl justify-items-center gap-4 px-6 py-24 text-center">
      <PackageSearch aria-hidden="true" className="size-10 text-primary" />
      <h1 className="font-display text-4xl font-medium tracking-tight">Page not found</h1>
      <Button asChild variant="outline">
        <Link href="/"><ArrowLeft aria-hidden="true" /> Browse marketplace</Link>
      </Button>
    </main>
  );
}
