import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useImportDialogStore } from '@/store/useImportDialogStore';
import { cn } from '@/lib/utils';

export function Toasts() {
  const toasts = useImportDialogStore((s) => s.toasts);
  const dismissToast = useImportDialogStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-center gap-2.5 pl-3 pr-2 py-2.5 rounded-xl border shadow-2xl backdrop-blur-xl text-sm animate-in slide-in-from-bottom-2 duration-200',
            toast.kind === 'success' && 'bg-green-950/80 border-green-700/50 text-green-100',
            toast.kind === 'error' && 'bg-red-950/80 border-red-700/50 text-red-100',
            toast.kind === 'info' && 'bg-gray-900/90 border-gray-700/50 text-gray-100'
          )}
        >
          {toast.kind === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
          {toast.kind === 'error' && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
          {toast.kind === 'info' && <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
          <span className="text-xs">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="ml-1 text-gray-400 hover:text-white transition-colors"
            aria-label="关闭提示"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
