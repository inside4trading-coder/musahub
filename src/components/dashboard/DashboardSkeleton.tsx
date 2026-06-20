import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton que calca el layout real del Dashboard mientras carga (en vez de un spinner). */
export function DashboardSkeleton() {
  return (
    <div>
      {/* Hero */}
      <Skeleton className="mb-6 h-24 rounded-2xl" />

      {/* KPI cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <Skeleton className="mb-3 h-9 w-9 rounded-xl" />
            <Skeleton className="mb-2 h-7 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <Skeleton className="mb-5 h-5 w-48" />
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <Skeleton className="mb-4 h-5 w-40" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <Skeleton className="mb-4 h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
