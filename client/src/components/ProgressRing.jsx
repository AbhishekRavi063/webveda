import { useEffect, useState } from 'react';

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Circular "3/6" indicator used in the header. */
export default function ProgressRing({ value, total }) {
  // Begin empty, then sweep to the real value after the header fades in.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(t);
  }, []);
  const pct = ready && total ? value / total : 0;

  return (
    <div className="relative size-20 shrink-0 sm:size-24" role="img" aria-label={`${value} of ${total} books read overall`}>
      <svg viewBox="0 0 72 72" className="size-full -rotate-90">
        <circle cx="36" cy="36" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          stroke="#c4cbf5"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-[1600ms] ease-gentle"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div>
          <span key={value} className="animate-pop inline-block text-2xl font-bold sm:text-3xl">
            {value}
          </span>
          <span className="text-sm text-white/60">/{total}</span>
        </div>
      </div>
    </div>
  );
}
