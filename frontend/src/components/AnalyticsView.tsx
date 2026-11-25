import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AnalyticsOverview } from '../types';
import { 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Award,
  Briefcase
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.analytics.getOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to load executive analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-slate-400 text-sm">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Calculating executive business metrics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-slate-500">
        Failed to load analytics data.
      </div>
    );
  }

  const taskCompletionRate = data.total_tasks > 0 
    ? Math.round((data.completed_tasks / data.total_tasks) * 100) 
    : 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Analytics & Performance</h1>
        <p className="text-sm text-slate-500">Live operational KPIs, SLA compliance rates & workforce productivity</p>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SLA Compliance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">SLA Compliance</span>
            <div className={`p-2 rounded-lg ${data.sla_compliance_rate >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{data.sla_compliance_rate}%</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> Target: 90%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Tickets resolved before deadline</p>
        </div>

        {/* Avg Resolution Time */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Avg Resolution Time</span>
            <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{data.avg_resolution_time_hours}</span>
            <span className="text-sm font-semibold text-slate-500">Hours</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Mean duration from creation to solved</p>
        </div>

        {/* Open Tickets */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Active Open Tickets</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{data.open_tickets}</span>
            <span className="text-xs text-slate-500">of {data.total_tickets} total</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Currently in triage or in-progress</p>
        </div>

        {/* Total Logged Hours */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Workforce Labor</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{data.total_logged_hours}</span>
            <span className="text-sm font-semibold text-slate-500">Hours</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Logged across {data.total_tasks} operations tasks</p>
        </div>
      </div>

      {/* Middle Row: Distribution Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Status Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Ticket Status Breakdown</h3>
          <div className="space-y-2.5 text-xs">
            <div>
              <div className="flex justify-between mb-1 font-semibold text-slate-700">
                <span>Open</span>
                <span>{data.tickets_by_status.open}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(data.tickets_by_status.open / (data.total_tickets || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold text-slate-700">
                <span>In Progress</span>
                <span>{data.tickets_by_status.in_progress}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(data.tickets_by_status.in_progress / (data.total_tickets || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold text-slate-700">
                <span>Waiting on Customer</span>
                <span>{data.tickets_by_status.waiting}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(data.tickets_by_status.waiting / (data.total_tickets || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold text-slate-700">
                <span>Resolved & Closed</span>
                <span>{data.tickets_by_status.resolved + data.tickets_by_status.closed}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${((data.tickets_by_status.resolved + data.tickets_by_status.closed) / (data.total_tickets || 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Priority Distribution</h3>
          <div className="space-y-2.5 text-xs">
            <div>
              <div className="flex justify-between mb-1 font-semibold text-red-600">
                <span>Urgent</span>
                <span>{data.tickets_by_priority.urgent}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(data.tickets_by_priority.urgent / (data.total_tickets || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold text-orange-600">
                <span>High</span>
                <span>{data.tickets_by_priority.high}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${(data.tickets_by_priority.high / (data.total_tickets || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold text-blue-600">
                <span>Medium</span>
                <span>{data.tickets_by_priority.medium}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(data.tickets_by_priority.medium / (data.total_tickets || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold text-slate-600">
                <span>Low</span>
                <span>{data.tickets_by_priority.low}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-slate-400 h-2 rounded-full" style={{ width: `${(data.tickets_by_priority.low / (data.total_tickets || 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Operations Execution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Operations Efficiency</h3>
            <p className="text-xs text-slate-500 mb-4">Kanban execution & dispatch completion rate</p>
            <div className="text-center py-4">
              <div className="text-4xl font-extrabold text-brand-600">{taskCompletionRate}%</div>
              <span className="text-xs font-semibold text-slate-500 mt-1 block">Tasks Completed On Schedule</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500 font-medium">
            <span>Completed: <strong className="text-slate-800">{data.completed_tasks}</strong></span>
            <span>Total Tasks: <strong className="text-slate-800">{data.total_tasks}</strong></span>
          </div>
        </div>
      </div>

      {/* Agent Performance Leaderboard Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Staff Performance Leaderboard</h3>
          </div>
          <span className="text-xs text-slate-400">Ranked by resolution & labor</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50/50 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3 text-center">Tickets Assigned</th>
                <th className="px-4 py-3 text-center">Tickets Resolved</th>
                <th className="px-4 py-3 text-center">Tasks Done</th>
                <th className="px-4 py-3 text-right">Logged Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.agent_leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">No staff performance data available yet.</td>
                </tr>
              ) : (
                data.agent_leaderboard.map((agent, idx) => (
                  <tr key={agent.agent_id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-bold text-slate-400">
                      {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{agent.full_name}</div>
                      <div className="text-[11px] text-slate-400">{agent.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-600">{agent.tickets_assigned}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        {agent.tickets_resolved}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-600">{agent.tasks_completed}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{agent.total_logged_hours} hrs</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
