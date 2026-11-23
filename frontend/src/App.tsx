import React, { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { Navbar } from './components/Navbar';
import { TicketsView } from './components/TicketsView';
import { KanbanView } from './components/KanbanView';
import { AnalyticsView } from './components/AnalyticsView';
import { TeamView } from './components/TeamView';
import { LiveToast, ToastNotification } from './components/LiveToast';

export const App: React.FC = () => {
  const { user, token, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'tickets' | 'kanban' | 'team' | 'analytics'>('tickets');
  const [wsConnected, setWsConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (type: string, title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [{ id, type, title, message }, ...prev].slice(0, 5));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!token) return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//localhost:8000/api/v1/ws/notifications?token=${encodeURIComponent(token)}`;

      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const ev = payload.event;
          const data = payload.data;

          if (ev === 'ticket_created') {
            addToast('ticket_created', 'New Support Ticket', `#${data.ticket_id.slice(0, 6)}: ${data.title}`);
          } else if (ev === 'task_status_changed') {
            addToast('task_status_changed', 'Task Status Updated', `Task moved to ${data.status.toUpperCase()}`);
          } else if (ev === 'system_announcement' || ev === 'urgent_alert') {
            addToast('urgent_alert', 'Broadcast Alert', `${data.sender}: ${data.message}`);
          }
        } catch {
          // Non-JSON message
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-400 font-medium">Loading WorkFlow Pro...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wsConnected={wsConnected}
      />

      <main className="flex-1">
        {activeTab === 'tickets' && <TicketsView />}
        {activeTab === 'kanban' && <KanbanView />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'team' && <TeamView />}
      </main>

      <LiveToast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};
