import { useCallback, useEffect, useRef, useState } from 'react';

/** A single short-lived message, e.g. "Marked Matilda as read". */
export function useToast(durationMs = 2800) {
  const [toast, setToast] = useState(null);
  const timer = useRef();

  const showToast = useCallback(
    (message) => {
      clearTimeout(timer.current);
      setToast({ id: Date.now(), message });
      timer.current = setTimeout(() => setToast(null), durationMs);
    },
    [durationMs]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return { toast, showToast };
}
