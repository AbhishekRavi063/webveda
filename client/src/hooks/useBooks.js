import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

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
      setPending((p) => withoutKey(p, book.id));
    }
  }

  return { books, status, loadError, pending, errors, loadBooks, toggleBook };
}
