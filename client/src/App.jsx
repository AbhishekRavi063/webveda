import Alert, { AlertButton } from './components/Alert.jsx';
import BookList from './components/BookList.jsx';
import Header from './components/Header.jsx';
import ListSkeleton from './components/ListSkeleton.jsx';
import Toast from './components/Toast.jsx';
import WelcomeVideo from './components/WelcomeVideo.jsx';
import { useBooks } from './hooks/useBooks.js';
import { useToast } from './hooks/useToast.js';

/**
 * The single page. Data lives in hooks; this file only decides layout and
 * which state (loading / error / ready) to show.
 */
export default function App() {
  const { toast, showToast } = useToast();
  const { books, status, loadError, pending, errors, slow, loadBooks, toggleBook } = useBooks({
    onSaved: (book) =>
      showToast(book.read ? `Marked “${book.title}” as read ✓` : `Marked “${book.title}” as unread`),
  });

  const fiction = books.filter((b) => b.list === 'fiction');
  const nonfiction = books.filter((b) => b.list === 'nonfiction');
  const totalRead = books.filter((b) => b.read).length;
  const listProps = { pending, errors, slow, onToggle: toggleBook };

  return (
    <div className="min-h-dvh pb-16">
      <Header status={status} totalRead={totalRead} total={books.length} />

      {/* Content overlaps the header slightly */}
      <main className="relative mx-auto -mt-12 grid max-w-6xl gap-6 px-4 sm:-mt-14 sm:px-6 lg:grid-cols-12 lg:items-start">
        <div className="lg:sticky lg:top-6 lg:col-span-7">
          <WelcomeVideo />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          {status === 'error' && (
            <div className="md:col-span-2 lg:col-span-1">
              <Alert kind="error" action={<AlertButton onClick={loadBooks}>Try again</AlertButton>}>
                Couldn't load your reading lists. {loadError}
              </Alert>
            </div>
          )}

          {status === 'loading' && (
            <>
              <span className="sr-only" role="status">
                Loading reading lists…
              </span>
              <ListSkeleton />
              <ListSkeleton />
            </>
          )}

          {status === 'ready' && (
            <>
              <BookList list="fiction" title="Fiction" books={fiction} delay={150} {...listProps} />
              <BookList list="nonfiction" title="Nonfiction" books={nonfiction} delay={350} {...listProps} />
            </>
          )}
        </div>
      </main>

      <Toast toast={toast} />
    </div>
  );
}
