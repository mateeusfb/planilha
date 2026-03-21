'use client';

export function SkeletonCard() {
  return (
    <div className="glass-card rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-16 rounded animate-shimmer" />
        <div className="w-8 h-8 rounded-lg animate-shimmer" />
      </div>
      <div className="h-7 w-28 rounded animate-shimmer mb-2" />
      <div className="h-2.5 w-24 rounded animate-shimmer" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="h-56 flex items-center justify-center">
      <div className="w-40 h-40 rounded-full border-[16px] animate-shimmer opacity-60" style={{ borderColor: 'var(--border)' }} />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-32 rounded animate-shimmer" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-20 rounded animate-shimmer" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-16 rounded animate-shimmer" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-20 rounded animate-shimmer" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-16 rounded animate-shimmer" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-12 rounded animate-shimmer" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-20 rounded animate-shimmer" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-24 rounded animate-shimmer" /></td>
    </tr>
  );
}

export function SkeletonDashboard() {
  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-40 rounded animate-shimmer" />
          <div className="w-5 h-5 rounded animate-shimmer" />
        </div>
        <div className="bento-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
      <div className="glass-card rounded-xl mb-4 overflow-hidden">
        <div className="px-4 md:px-5 py-3">
          <div className="h-4 w-24 rounded animate-shimmer" />
        </div>
        <div className="px-3 md:px-5 pb-4 md:pb-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </div>
      </div>
    </>
  );
}
