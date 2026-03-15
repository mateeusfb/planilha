'use client';

export function SkeletonCard() {
  return (
    <div className="t-card rounded-xl p-4 border animate-pulse">
      <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
      <div className="h-7 w-28 bg-slate-200 rounded mb-2" />
      <div className="h-2.5 w-24 bg-slate-100 rounded" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="h-56 flex items-center justify-center animate-pulse">
      <div className="w-40 h-40 rounded-full border-[16px] border-slate-200 opacity-60" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-32 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-12 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3 border-b t-border-light"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
    </tr>
  );
}

export function SkeletonDashboard() {
  return (
    <>
      <div className="t-card rounded-xl border mb-4 overflow-hidden">
        <div className="px-4 md:px-5 py-3">
          <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="px-3 md:px-5 pb-4 md:pb-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
      <div className="t-card rounded-xl border mb-4 overflow-hidden">
        <div className="px-4 md:px-5 py-3">
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
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
