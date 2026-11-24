import ProgressRing from './ProgressRing.jsx';

function progressLabel(status, read, total) {
  if (status === 'loading') return 'Loading…';
  if (status !== 'ready') return 'Unavailable';
  if (read === total) return 'Challenge complete!';
  const left = total - read;
  return `${left} book${left === 1 ? '' : 's'} to go`;
}

/** Navy hero with the title and the overall progress ring. */
export default function Header({ status, totalRead, total }) {
  return (
    <header className="relative overflow-hidden bg-navy text-white">
      {/* Soft shapes and a rising line, echoing the WebVeda banner style */}
      <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-navy-deep blur-2xl" aria-hidden="true" />
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-10 h-40 w-full opacity-20"
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline points="0,150 220,120 420,135 640,70 860,95 1200,10" fill="none" stroke="#c4cbf5" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-20 pt-10 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-24 sm:pt-14">
        <div className="animate-fade-up max-w-xl" style={{ animationDelay: '50ms' }}>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15">
            <span className="size-1.5 rounded-full bg-brand-tint" aria-hidden="true" />
            Library reading challenge
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            <span className="text-brand-tint">Reading</span> Challenge Tracker
          </h1>
          <p className="mt-3 text-base text-white/75 sm:text-lg">
            Tick off books as you finish them. Your progress and your place in the welcome video are saved automatically.
          </p>
        </div>

        <div
          className="animate-fade-up flex items-center gap-4 self-start rounded-3xl bg-white/[0.08] p-3 pr-5 ring-1 ring-white/15 backdrop-blur sm:self-auto"
          style={{ animationDelay: '200ms' }}
        >
          {status === 'ready' ? (
            <ProgressRing value={totalRead} total={total} />
          ) : (
            <div className="size-20 animate-pulse rounded-full bg-white/20 sm:size-24" aria-hidden="true" />
          )}
          <div>
            <p className="text-sm text-white/60">Overall progress</p>
            <p className="font-semibold">{progressLabel(status, totalRead, total)}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
