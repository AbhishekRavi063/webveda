import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const SLOW_MS = 400;

function withoutKey(obj, key) {
  const next = { ...obj };
  delete next[key];
  return next;
}

/**
 * Owns all reading-list state.
 *
 * - `books`   last values the server confirmed (never optimistic)
 * - `pending` id -> value currently being saved (shown while in flight)
 * - `errors`  id -> save error message
 * - `slow`    id -> true once a save has taken longer than SLOW_MS, so the
 *             UI only shows a spinner when the network is actually slow
 *
 * If a save fails, `pending` is cleared and `books` was never changed,
 * so the UI falls back to the last saved value automatically.
 */
export function useBooks({ onSaved } = {}) {
  const [books, setBooks] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState('');
  const [pending, setPending] = useState({});
  const [errors, setErrors] = useState({});
  const [slow, setSlow] = useState({});
  const slowTimers = useRef({});

  useEffect(() => () => Object.values(slowTimers.current).forEach(clearTimeout), []);

  const loadBooks = useCallback(async () => {
    setStatus('loading');
    setLoadError('');
    try {
      setBooks(await api.getBooks());
      setStatus('ready');
    } catch (err) {
      setLoadError(err.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  async function toggleBook(book, read) {
    if (pending[book.id] !== undefined) return; // one request per book at a time
    setPending((p) => ({ ...p, [book.id]: read }));
    setErrors((e) => withoutKey(e, book.id));
    slowTimers.current[book.id] = setTimeout(() => setSlow((s) => ({ ...s, [book.id]: true })), SLOW_MS);
    try {
      const updated = await api.updateBook(book.id, read);
      setBooks((bs) => bs.map((b) => (b.id === updated.id ? updated : b)));
      onSaved?.(updated);
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [book.id]: `Couldn't save "${book.title}", so it's still marked ${book.read ? 'read' : 'unread'}. ${err.message}`,
      }));
    } finally {
      clearTimeout(slowTimers.current[book.id]);
      delete slowTimers.current[book.id];
      setSlow((s) => withoutKey(s, book.id));
      setPending((p) => withoutKey(p, book.id));
    }
  }

  return { books, status, loadError, pending, errors, slow, loadBooks, toggleBook };
}
