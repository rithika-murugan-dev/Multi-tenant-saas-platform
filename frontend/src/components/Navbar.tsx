import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  LifeBuoy, 
  Kanban, 
  BarChart3,
  LogOut, 
  User, 
  Activity,
  Users
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'tickets' | 'kanban' | 'team' | 'analytics';
  setActiveTab: (tab: 'tickets' | 'kanban' | 'team' | 'analytics') => void;
  wsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, wsConnected }) => {
  const { user, tenant, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Company Name */}
          <div className="flex items-center space-x-3">
            <div className="bg-brand-600 text-white p-2 rounded-lg shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">
                  {tenant?.name || 'SaaS Platform'}
                </span>
                <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded border border-slate-200">
                  {tenant?.slug}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Helpdesk & Business Operations</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === 'tickets'
                  ? 'bg-brand-50 text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LifeBuoy className="w-4 h-4" />
              <span>Tickets</span>
            </button>

            {user?.role !== 'customer' && (
              <button
                onClick={() => setActiveTab('kanban')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === 'kanban'
                    ? 'bg-brand-50 text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Kanban className="w-4 h-4" />
                <span>Kanban</span>
              </button>
            )}

            {user?.role !== 'customer' && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === 'analytics'
                    ? 'bg-brand-50 text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>
            )}

            {user?.role !== 'customer' && (
              <button
                onClick={() => setActiveTab('team')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === 'team'
                    ? 'bg-brand-50 text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Team</span>
              </button>
            )}
          </nav>

          {/* Live WebSocket Indicator & User Profile */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'
                }`}
              />
              <span className={wsConnected ? 'text-emerald-700' : 'text-slate-500'}>
                {wsConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-none">
                  {user?.full_name}
                </p>
                <span className="text-[10px] uppercase font-bold tracking-wider text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                  {user?.role.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
