import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export default function Toast({ message, onClose, duration = 3200 }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[70] flex max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)] animate-toast-in"
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
      <p className="text-sm font-medium text-slate-700">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="ml-1 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
