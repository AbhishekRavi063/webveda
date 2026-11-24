import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Alert, { AlertButton } from './Alert.jsx';

const VIDEO_URL = import.meta.env.VITE_VIDEO_URL || 'https://www.w3schools.com/html/mov_bbb.mp4';

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const MEDIA_ERRORS = {
  1: 'Video loading was stopped.',
  2: 'A network error stopped the video from loading.',
  3: 'The video could not be decoded.',
  4: 'The video file could not be found or is not supported.',
};

export default function WelcomeVideo() {
  const videoRef = useRef(null);
  const appliedRef = useRef(false);
  const skipSeekSaveRef = useRef(false);

  const [savedPosition, setSavedPosition] = useState(null); // null = not loaded yet
  const [progressError, setProgressError] = useState('');
  const [metadataReady, setMetadataReady] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [saveState, setSaveState] = useState({ kind: 'idle', message: '' });

  // 1. Load the saved position from the backend.
  useEffect(() => {
    let cancelled = false;
    api
      .getVideoProgress()
      .then((data) => !cancelled && setSavedPosition(data.position))
      .catch((err) => {
        if (cancelled) return;
        setProgressError(`Couldn't load your saved place, so the video will start from the beginning. ${err.message}`);
        setSavedPosition(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Once both the saved position and the video metadata are available,
  //    jump to the saved point once, so the next play resumes from there.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || appliedRef.current || savedPosition === null || !metadataReady) return;
    appliedRef.current = true;
    // If the reader paused within the last second, treat it as finished.
    if (savedPosition > 0 && savedPosition < video.duration - 1) {
      skipSeekSaveRef.current = true; // this seek restores, it shouldn't re-save
      video.currentTime = savedPosition;
    }
  }, [savedPosition, metadataReady]);

  async function savePosition(position) {
    setSaveState({ kind: 'saving', message: 'Saving your place…' });
    try {
      const data = await api.saveVideoProgress(position);
      setSavedPosition(data.position);
      setSaveState({ kind: 'success', message: `Saved your place at ${formatTime(data.position)}.` });
    } catch (err) {
      setSaveState({ kind: 'error', message: `Couldn't save your place in the video. ${err.message}` });
    }
  }

  function handlePause() {
    const video = videoRef.current;
    // When the video finishes, the browser fires "pause" with ended=true;
    // reset to 0 so the next visit starts from the beginning.
    savePosition(video.ended ? 0 : video.currentTime);
  }

  function handleSeeked() {
    // Seeking while paused also changes where the next play starts.
    const video = videoRef.current;
    if (skipSeekSaveRef.current) {
      skipSeekSaveRef.current = false;
      return;
    }
    if (video.paused && appliedRef.current && !video.ended) savePosition(video.currentTime);
  }

  function handleError() {
    const code = videoRef.current?.error?.code;
    setPlaybackError(MEDIA_ERRORS[code] || 'The video could not be played.');
  }

  const loading = savedPosition === null || (!metadataReady && !playbackError);

  return (
    <section
      aria-labelledby="welcome-video"
      style={{ animationDelay: '100ms' }}
      className="animate-fade-up overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(7,8,21,0.04),0_12px_32px_-16px_rgba(35,44,110,0.25)]"
    >
      <div className="group relative bg-ink">
        <video
          ref={videoRef}
          className="aspect-video w-full"
          src={VIDEO_URL}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={() => setMetadataReady(true)}
          onPause={handlePause}
          onSeeked={handleSeeked}
          onError={handleError}
          onPlay={() => setPlaybackError('')}
        >
          Your browser does not support HTML video.
        </video>
        {loading && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-navy to-navy-deep text-sm text-white/80">
            <span className="size-8 animate-spin rounded-full border-[3px] border-white/20 border-t-white" aria-hidden="true" />
            Loading video…
          </div>
        )}
        {playbackError && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-gradient-to-br from-navy to-navy-deep text-brand-tint" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" className="size-12">
              <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M10 9.5v5l4.5-2.5-4.5-2.5z" fill="currentColor" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="welcome-video" className="text-xl font-semibold text-ink sm:text-2xl">
              Welcome to the <span className="text-brand">challenge</span>
            </h2>
            <p className="mt-1 text-sm text-muted">
              A short hello from the library. Pause any time and we'll remember your spot.
            </p>
          </div>
          {savedPosition > 0 && !playbackError && (
            <span
              key={savedPosition}
              className="animate-pop inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-sm font-medium text-white"
            >
              <svg viewBox="0 0 20 20" className="size-3.5" fill="currentColor" aria-hidden="true">
                <path d="M6 4.5v11l9-5.5-9-5.5z" />
              </svg>
              Resumes from {formatTime(savedPosition)}
            </span>
          )}
        </div>

        <div className="mt-3 space-y-2" aria-live="polite">
          {playbackError && (
            <Alert
              kind="error"
              action={
                <AlertButton
                  onClick={() => {
                    setPlaybackError('');
                    setMetadataReady(false);
                    appliedRef.current = false;
                    videoRef.current?.load();
                  }}
                >
                  Retry
                </AlertButton>
              }
            >
              {playbackError}
            </Alert>
          )}
          {progressError && <Alert kind="error">{progressError}</Alert>}
          {saveState.kind === 'error' && <Alert kind="error">{saveState.message}</Alert>}
          {saveState.kind === 'saving' && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <span className="size-3.5 animate-spin rounded-full border-2 border-brand-tint border-t-brand" aria-hidden="true" />
              {saveState.message}
            </p>
          )}
          {saveState.kind === 'success' && (
            <p key={saveState.message} className="animate-fade-up flex items-center gap-2 text-sm font-medium text-brand">
              <span aria-hidden="true">✓</span>
              {saveState.message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
