export function ListingDetailLoading() {
  return (
    <main id="main-content" className="mx-auto max-w-[1240px] px-4 pt-6 pb-16 sm:px-6 sm:pt-9">
      <div role="status">
        <span className="sr-only">Loading listing…</span>
        <div aria-hidden="true" className="motion-safe:animate-pulse">
          <div className="mb-5 h-5 w-32 rounded bg-muted" />
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)] lg:gap-8">
            <div className="aspect-square max-h-[660px] rounded-2xl border bg-muted sm:aspect-[1.18]" />
            <div className="space-y-5 rounded-2xl border bg-card p-5 sm:p-7">
              <div className="h-5 w-24 rounded bg-muted" />
              <div className="h-10 w-3/4 rounded bg-muted" />
              <div className="h-8 w-24 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-20 rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
