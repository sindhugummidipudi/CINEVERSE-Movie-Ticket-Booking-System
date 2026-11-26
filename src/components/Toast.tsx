import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastItem } from '../types';

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-200 ${
            t.type === 'success'
              ? 'bg-[#141915]/95 border-emerald-500/30 text-emerald-100'
              : t.type === 'error'
                ? 'bg-[#1F1215]/95 border-[#A82438]/60 text-red-100'
                : 'bg-[#161419]/95 border-[#D4AF37]/35 text-[#F5F2EB]'
          }`}
        >
          {t.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          {t.type === 'error' && (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          )}
          {t.type === 'info' && (
            <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
          )}
          <p className="text-sm leading-snug flex-1">{t.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="text-white/50 hover:text-white transition-colors p-0.5 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
