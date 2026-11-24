const STYLES = {
  error: { box: 'border-red-200 bg-red-50 text-red-800', icon: '⚠️' },
  success: { box: 'border-brand-tint bg-brand-soft text-navy', icon: '✓' },
  info: { box: 'border-slate-200 bg-white text-slate-700', icon: 'ℹ️' },
};

export default function Alert({ kind = 'info', children, action, className = '' }) {
  const style = STYLES[kind];
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`animate-fade-up flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${style.box} ${className}`}
    >
      <span className="flex min-w-0 flex-1 gap-2">
        <span aria-hidden="true">{style.icon}</span>
        <span>{children}</span>
      </span>
      {action}
    </div>
  );
}

export function AlertButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition duration-300 ease-smooth hover:bg-red-700 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
    >
      {children}
    </button>
  );
}
