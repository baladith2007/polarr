import React from 'react';
import { Satellite, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="bg-slate-900 text-white px-4 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Satellite className="w-5 h-5 text-sky-400 flex-shrink-0 animate-pulse" />
          <p className="text-xs font-mono font-semibold text-slate-100 leading-snug truncate">
            {message}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            ACK 200
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-white text-xs font-mono px-1 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};
