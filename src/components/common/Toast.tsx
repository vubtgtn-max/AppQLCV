import React from 'react';
import { useRealtime } from '../../contexts/RealtimeContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage, clearToast } = useRealtime();

  if (!toastMessage) return null;

  const getIcon = () => {
    switch (toastMessage.type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
      case 'urgent':
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white text-slate-800 border border-gray-200 shadow-xl">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-900 leading-tight">{toastMessage.title}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">{toastMessage.body}</p>
        </div>
        <button
          onClick={clearToast}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
