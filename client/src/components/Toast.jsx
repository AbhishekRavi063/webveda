/** Bottom-centre confirmation message. `toast` comes from useToast(). */
export default function Toast({ toast }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4" aria-live="polite">
      {toast && (
        <div
          key={toast.id}
          className="animate-toast-in rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_32px_-12px_rgba(35,44,110,0.6)]"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
