import { useEffect, useState } from 'react';
import { BOOK_META, LIST_STYLES } from '../bookMeta.js';

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-3.5" aria-hidden="true">
      <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ListIcon({ kind }) {
  return kind === 'globe' ? (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19M10 8h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return <span className="size-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" aria-hidden="true" />;
}

export default function BookList({ list, title, books, pending, errors, slow = {}, onToggle, delay = 0 }) {
  const style = LIST_STYLES[list];
  // The checkbox shows the in-flight value while saving; otherwise the last
  // value the server confirmed. A failed save simply clears `pending`, so the
  // last saved value is what stays visible.
  const displayed = books.map((b) => ({ ...b, shown: pending[b.id] ?? b.read }));
  const readCount = displayed.filter((b) => b.shown).length;
  const complete = books.length > 0 && readCount === books.length;
  const pct = books.length ? (readCount / books.length) * 100 : 0;
  const headingId = `list-${list}`;

  // Start the bar at 0 and let it fill once the card has faded in,
  // so the progress visibly "grows" on page load.
  const [barReady, setBarReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBarReady(true), delay + 450);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <section
      aria-labelledby={headingId}
      className="animate-fade-up rounded-3xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(7,8,21,0.04),0_12px_32px_-16px_rgba(35,44,110,0.25)] sm:p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${style.iconTile}`} aria-hidden="true">
            <ListIcon kind={style.icon} />
          </span>
          <div>
            <h2 id={headingId} className="text-xl font-semibold leading-tight text-ink">
              {title}
            </h2>
            <p className="text-sm text-muted">{style.tagline}</p>
          </div>
        </div>
        <p
          key={readCount}
          className={`animate-pop shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${style.chip}`}
          aria-live="polite"
        >
          {readCount} of {books.length} read
        </p>
      </div>

      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className={`h-full w-full origin-left rounded-full ${style.bar} transition-transform duration-[1400ms] ease-gentle will-change-transform`}
          style={{ transform: `scaleX(${barReady ? pct / 100 : 0})` }}
        />
      </div>

      <ul className="space-y-2.5">
        {displayed.map((book, i) => {
          // The new value shows instantly; the spinner only appears if the
          // save is still running after a short delay (see useBooks).
          const saving = pending[book.id] !== undefined;
          const slowSave = saving && slow[book.id];
          const error = errors[book.id];
          const meta = BOOK_META[book.id] ?? { author: '', spine: '#9ea1b8' };
          return (
            <li key={book.id} className="animate-fade-up" style={{ animationDelay: `${delay + 250 + i * 120}ms` }}>
              <label
                key={error ?? 'ok'}
                className={`group relative flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition-[transform,box-shadow,background-color,border-color] duration-500 ease-smooth hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_rgba(35,44,110,0.35)] active:translate-y-0 active:scale-[0.99] active:duration-150 ${
                  book.shown ? style.readRow : 'border-slate-200 bg-white hover:border-brand-tint'
                } ${slowSave ? 'cursor-wait' : ''} ${error ? 'animate-shake border-red-300' : ''}`}
              >
                {/* Book spine */}
                <span
                  className="h-11 w-2.5 shrink-0 rounded-sm shadow-inner transition-transform duration-700 ease-smooth group-hover:-rotate-6"
                  style={{ backgroundColor: meta.spine }}
                  aria-hidden="true"
                />

                <span className="min-w-0 flex-1">
                  <span
                    className={`block font-medium leading-snug transition-colors duration-500 ease-smooth ${
                      book.shown ? 'text-navy/70' : 'text-ink'
                    }`}
                  >
                    {book.title}
                  </span>
                  {meta.author && <span className="block truncate text-xs text-muted">{meta.author}</span>}
                </span>

                <span className="hidden text-xs font-medium text-muted sm:inline md:hidden lg:inline">
                  {slowSave ? 'Saving…' : book.shown ? 'Read' : 'Unread'}
                </span>

                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={book.shown}
                  disabled={saving}
                  onChange={(e) => onToggle(book, e.target.checked)}
                  aria-describedby={error ? `${book.id}-error` : undefined}
                />
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-white ring-offset-2 transition-[background-color,border-color,box-shadow] duration-500 ease-smooth peer-focus-visible:ring-2 ${style.ring} ${
                    book.shown ? style.check : 'border-brand-tint bg-white group-hover:border-brand'
                  }`}
                  aria-hidden="true"
                >
                  {slowSave ? (
                    <Spinner />
                  ) : (
                    book.shown && (
                      <span key="check" className="animate-pop">
                        <CheckIcon />
                      </span>
                    )
                  )}
                </span>
              </label>
              {error && (
                <p id={`${book.id}-error`} role="alert" className="animate-fade-up mt-1.5 flex gap-1.5 px-2 text-sm text-red-700">
                  <span aria-hidden="true">⚠️</span>
                  <span>{error}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {complete && (
        <p className="animate-pop mt-4 flex items-center justify-center gap-2 rounded-2xl bg-navy px-4 py-3 text-center text-sm font-semibold text-white">
          <span className="grid size-5 place-items-center rounded-full bg-white text-navy" aria-hidden="true">
            <CheckIcon />
          </span>
          List complete. Great reading!
        </p>
      )}
    </section>
  );
}
