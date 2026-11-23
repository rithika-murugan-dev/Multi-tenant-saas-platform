import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { KanbanBoard, Task, TaskPriority, TaskStatus, Ticket, User } from '../types';
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  User as UserIcon, 
  Trash2,
  Link as LinkIcon
} from 'lucide-react';

export const KanbanView: React.FC = () => {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);

  // Create Task Modal state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [ticketId, setTicketId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [estHours, setEstHours] = useState('2.0');

  const fetchKanban = async () => {
    try {
      setLoading(true);
      const data = await api.tasks.getKanban();
      setBoard(data);
    } catch (err) {
      console.error('Failed to load Kanban board:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanban();
    api.tickets.list().then(setTickets).catch(() => {});
    api.users.list().then(setTeamMembers).catch(() => {});
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.tasks.update(taskId, { status: newStatus });
      fetchKanban();
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.tasks.create({
        title,
        description: description || undefined,
        priority,
        ticket_id: ticketId || undefined,
        assignee_id: assigneeId || undefined,
        estimated_hours: parseFloat(estHours) || undefined,
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      fetchKanban();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    }
  };

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      case 'low': return 'bg-slate-400 text-white';
    }
  };

  const columns: { id: TaskStatus; title: string; color: string; list: Task[] }[] = [
    { id: 'todo', title: 'To Do', color: 'border-slate-300', list: board?.todo || [] },
    { id: 'in_progress', title: 'In Progress', color: 'border-amber-400', list: board?.in_progress || [] },
    { id: 'in_review', title: 'In Review', color: 'border-indigo-400', list: board?.in_review || [] },
    { id: 'done', title: 'Completed', color: 'border-emerald-500', list: board?.done || [] },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Operations (Kanban)</h1>
          <p className="text-sm text-slate-500">Jira-style task tracking, time logging & workload dispatch</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Operational Task</span>
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {columns.map((col) => (
          <div key={col.id} className="bg-slate-100/80 rounded-xl p-3 border border-slate-200/80 min-h-[600px] flex flex-col">
            <div className={`flex items-center justify-between pb-3 mb-3 border-b-2 ${col.color}`}>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">{col.title}</span>
                <span className="bg-white text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200">
                  {col.list.length}
                </span>
              </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {col.list.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                  No tasks
                </div>
              ) : (
                col.list.map((task) => (
                  <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {task.estimated_hours && (
                        <span className="flex items-center space-x-1 text-[11px] text-slate-500 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{task.logged_hours} / {task.estimated_hours}h</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-semibold text-slate-900 text-sm mb-1">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</p>
                    )}

                    {/* Linked Ticket Badge */}
                    {task.ticket && (
                      <div className="flex items-center space-x-1 text-[11px] text-brand-600 bg-brand-50 p-1 rounded border border-brand-100 mb-3">
                        <LinkIcon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">Ticket: {task.ticket.title}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center space-x-1 text-slate-600 font-medium">
                        <UserIcon className="w-3 h-3 text-slate-400" />
                        <span>{task.assignee?.full_name || 'Unassigned'}</span>
                      </div>

                      {/* Move status buttons */}
                      <div className="flex space-x-1">
                        {col.id !== 'todo' && (
                          <button
                            onClick={() => handleStatusChange(task.id, 'todo')}
                            title="Move to To Do"
                            className="p-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded"
                          >
                            ToDo
                          </button>
                        )}
                        {col.id !== 'in_progress' && (
                          <button
                            onClick={() => handleStatusChange(task.id, 'in_progress')}
                            title="Move to In Progress"
                            className="p-1 text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-800 rounded font-semibold"
                          >
                            Progress
                          </button>
                        )}
                        {col.id !== 'done' && (
                          <button
                            onClick={() => handleStatusChange(task.id, 'done')}
                            title="Complete Task"
                            className="p-1 text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-semibold"
                          >
                            Done
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Create Operational Task</h2>
            <p className="text-xs text-slate-500 mb-4">Assign work orders to technicians or team members</p>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Inspect motor bearing wear"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={estHours}
                    onChange={(e) => setEstHours(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Assign Employee</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Link to Support Ticket (Optional)</label>
                <select
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="">None (Standalone task)</option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>#{t.id.slice(0, 8)} - {t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task instructions for technician..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 shadow"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
