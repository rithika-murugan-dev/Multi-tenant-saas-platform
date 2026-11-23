import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, MessageSquare, X } from 'lucide-react';

export interface ToastNotification {
  id: string;
  type: string;
  title: string;
  message: string;
}

interface LiveToastProps {
  toasts: ToastNotification[];
  removeToast: (id: string) => void;
}

export const LiveToast: React.FC<LiveToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex items-start space-x-3 transition transform duration-300 ease-out"
        >
          <div className="bg-brand-600 p-1.5 rounded-lg text-white mt-0.5">
            {toast.type === 'ticket_created' ? (
              <Bell className="w-4 h-4" />
            ) : toast.type === 'task_status_changed' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="font-semibold text-xs tracking-wider uppercase text-brand-400">{toast.title}</h5>
            <p className="text-xs text-slate-200 mt-0.5 leading-snug">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
