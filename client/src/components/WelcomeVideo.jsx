import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Alert, { AlertButton } from './Alert.jsx';

const VIDEO_URL = import.meta.env.VITE_VIDEO_URL || 'https://www.w3schools.com/html/mov_bbb.mp4';

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const PlayIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
  </svg>
);
const PauseIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1.2" />
    <rect x="14" y="5" width="4" height="14" rx="1.2" />
  </svg>
);
const SoundIcon = ({ muted, className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
    {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
  </svg>
);
const FullscreenIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
  </svg>
);

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
  const playerRef = useRef(null);
  const seekSaveTimer = useRef();

  // Custom player state (the native controls are hidden)
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true); // autoplay is only allowed while muted
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

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
    // Autoplay (muted, looping) from the saved point. If the browser blocks
    // autoplay, the big play button is shown instead; that isn't an error.
    video.play().catch(() => {});
  }, [savedPosition, metadataReady]);

  useEffect(() => () => clearTimeout(seekSaveTimer.current), []);

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
    if (video.paused && appliedRef.current && !video.ended) {
      // Dragging the seek bar fires many seeks; save once it settles.
      clearTimeout(seekSaveTimer.current);
      seekSaveTimer.current = setTimeout(() => savePosition(video.currentTime), 500);
    }
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video || playbackError) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  function seekTo(seconds) {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = Math.min(Math.max(seconds, 0), duration);
    setTime(video.currentTime);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function goFullscreen() {
    const el = playerRef.current;
    const video = videoRef.current;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el?.requestFullscreen) el.requestFullscreen();
    else video?.webkitEnterFullscreen?.(); // iPhone Safari
  }

  function handleKeyDown(e) {
    if (e.target.tagName === 'INPUT') return; // let the seek bar handle its own keys
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      seekTo(time + 5);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seekTo(time - 5);
    } else if (e.key === 'm') {
      toggleMute();
    }
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
      <div
        ref={playerRef}
        className="group relative bg-ink outline-none focus-visible:ring-4 focus-visible:ring-brand-tint"
        tabIndex={0}
        role="group"
        aria-label="Welcome video player. Space to play or pause, arrow keys to seek."
        onKeyDown={handleKeyDown}
      >
        <video
          ref={videoRef}
          className="aspect-video w-full cursor-pointer"
          src={VIDEO_URL}
          muted
          loop
          playsInline
          preload="metadata"
          onClick={togglePlay}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            setMetadataReady(true);
          }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onPlay={() => {
            setPlaying(true);
            setPlaybackError('');
          }}
          onPause={() => {
            setPlaying(false);
            handlePause();
          }}
          onSeeked={handleSeeked}
          onError={handleError}
        >
          Your browser does not support HTML video.
        </video>

        {!loading && !playbackError && (
          <>
            {/* Centre button: always shown while paused, on hover while playing */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause video' : 'Play video'}
              className={`absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy shadow-[0_12px_32px_-8px_rgba(7,8,21,0.5)] backdrop-blur transition-[opacity,transform] duration-500 ease-smooth hover:scale-105 active:scale-95 sm:size-20 ${
                playing ? 'pointer-events-none scale-90 opacity-0 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100' : 'scale-100 opacity-100'
              }`}
            >
              {playing ? <PauseIcon className="size-7 sm:size-8" /> : <PlayIcon className="ml-1 size-7 sm:size-8" />}
            </button>

            {/* Mute: always reachable, since autoplay starts muted */}
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-ink/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors duration-300 hover:bg-ink/75"
            >
              <SoundIcon muted={muted} className="size-4" />
              {muted && <span>Tap to unmute</span>}
            </button>

            {/* Bottom bar: seek (required by the spec), time, fullscreen. Visible while paused or on hover. */}
            <div
              className={`absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-ink/80 to-transparent px-3 pb-3 pt-10 text-white transition-opacity duration-500 ease-smooth sm:px-4 ${
                playing ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100' : 'opacity-100'
              }`}
            >
              <input
                type="range"
                className="video-seek flex-1"
                min={0}
                max={duration || 0}
                step={0.1}
                value={time}
                onChange={(e) => seekTo(Number(e.target.value))}
                aria-label="Seek"
                aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
                style={{ '--fill': `${duration ? (time / duration) * 100 : 0}%` }}
              />
              <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-white/85">
                {formatTime(time)} / {formatTime(duration)}
              </span>
              <button type="button" onClick={goFullscreen} aria-label="Full screen" className="grid size-8 place-items-center rounded-full transition-colors hover:bg-white/15">
                <FullscreenIcon className="size-4" />
              </button>
            </div>
          </>
        )}

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
              A short hello from the library. Tap the video to pause; we'll remember your spot.
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
                    setPlaying(false);
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
