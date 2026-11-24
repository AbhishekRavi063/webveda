/** Placeholder card shown while the reading lists load. */
export default function ListSkeleton() {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_12px_32px_-16px_rgba(35,44,110,0.25)]" aria-hidden="true">
      <div className="flex animate-pulse items-center gap-3">
        <div className="size-11 rounded-2xl bg-brand-soft" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-brand-tint/50" />
          <div className="h-3 w-1/2 rounded bg-brand-soft" />
        </div>
      </div>
      <div className="mt-5 h-2 animate-pulse rounded-full bg-brand-soft" />
      <div className="mt-5 space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-brand-soft" style={{ animationDelay: `${i * 200}ms` }} />
        ))}
      </div>
    </div>
  );
}
