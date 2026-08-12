import { Skeleton } from "@/components/ui/Skeleton";

// Shown the instant a sidebar link is clicked, for as long as the server is
// still working on the route.
//
// Without a loading boundary the App Router has nothing to show during a
// navigation, so the browser sits on the PREVIOUS page until the new one is
// completely ready — which read as the dashboard being frozen rather than
// busy. It also gave Next no static shell to prefetch for these routes, so
// the sidebar's <Link> prefetching bought nothing.
//
// Deliberately generic: this one file covers every admin route, and the
// screens behind it differ too much (table, cards, master–detail) for a
// pixel-accurate skeleton to be right on more than one of them. A heading and
// a few blocks are enough to say "this page is coming" without pretending to
// predict the layout.
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-52" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}
