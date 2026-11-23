import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Ticket, TicketMessage, TicketPriority, TicketStatus, User } from '../types';
import { 
  Plus, 
  MessageSquare, 
  Lock, 
  Clock, 
  User as UserIcon, 
  CheckCircle2, 
  Send,
  Filter,
  AlertCircle
} from 'lucide-react';

export const TicketsView: React.FC = () => {
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Reply box state
  const [replyContent, setReplyContent] = useState('');
  const [replyType, setReplyType] = useState<'public_reply' | 'internal_note'>('public_reply');
  const [sendingReply, setSendingReply] = useState(false);

  // New Ticket Modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TicketPriority>('medium');
  const [newCustomerId, setNewCustomerId] = useState<string>('');
  const [newAgentId, setNewAgentId] = useState<string>('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await api.tickets.list(statusFilter || undefined);
      setTickets(data);
      if (data.length > 0 && !selectedTicket) {
        loadTicketDetails(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetails = async (ticketId: string) => {
    try {
      const detailed = await api.tickets.get(ticketId);
      setSelectedTicket(detailed);
    } catch (err) {
      console.error('Failed to get ticket details:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    if (!isCustomer) {
      api.users.list().then(setAllUsers).catch(() => {});
    }
  }, [statusFilter]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyContent.trim()) return;

    try {
      setSendingReply(true);
      await api.tickets.postMessage(selectedTicket.id, replyContent, replyType);
      setReplyContent('');
      await loadTicketDetails(selectedTicket.id);
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to post reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.tickets.create({
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        customer_id: newCustomerId || undefined,
        assigned_agent_id: newAgentId || undefined,
      });
      setShowNewModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewCustomerId('');
      setNewAgentId('');
      await fetchTickets();
      setSelectedTicket(created);
    } catch (err: any) {
      alert(err.message || 'Failed to create ticket');
    }
  };

  const handleUpdateStatus = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;
    try {
      const updated = await api.tickets.update(selectedTicket.id, { status: newStatus });
      setSelectedTicket(updated);
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket');
    }
  };

  const handleAssignAgent = async (agentId: string) => {
    if (!selectedTicket) return;
    try {
      const updated = await api.tickets.update(selectedTicket.id, { 
        assigned_agent_id: agentId || undefined 
      });
      setSelectedTicket(updated);
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to assign agent');
    }
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low': return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'open': return 'bg-blue-500 text-white';
      case 'in_progress': return 'bg-amber-500 text-white';
      case 'waiting': return 'bg-purple-500 text-white';
      case 'resolved': return 'bg-emerald-500 text-white';
      case 'closed': return 'bg-slate-500 text-white';
    }
  };

  const customerList = allUsers.filter((u) => u.role === 'customer');
  const agentList = allUsers.filter((u) => u.role !== 'customer');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Helpdesk Tickets</h1>
          <p className="text-sm text-slate-500">Customer requests, SLA tracking & communications</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
            {['', 'open', 'in_progress', 'resolved'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded font-medium transition capitalize ${
                  statusFilter === s
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg shadow-sm transition ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Ticket</span>
          </button>
        </div>
      </div>

      {/* Split-View Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Ticket List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[750px]">
          <div className="p-3 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between">
            <span>Inbox ({tickets.length})</span>
            <span>Sorted by newest</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading && tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No tickets found in this view.</div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => loadTicketDetails(t.id)}
                  className={`p-4 cursor-pointer transition text-left hover:bg-slate-50 ${
                    selectedTicket?.id === t.id ? 'bg-brand-50/70 border-l-4 border-brand-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getStatusBadge(t.status)}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityBadge(t.priority)}`}>
                      {t.priority}
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-900 text-sm line-clamp-1 mb-1">{t.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-2">{t.description}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <span className="flex items-center space-x-1">
                      <UserIcon className="w-3 h-3" />
                      <span>{t.customer.full_name}</span>
                    </span>
                    {t.due_at && (
                      <span className="flex items-center space-x-1 text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>SLA: {new Date(t.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Ticket Detail & Conversation */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-[750px] overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${getStatusBadge(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${getPriorityBadge(selectedTicket.priority)}`}>
                      {selectedTicket.priority} Priority
                    </span>
                  </div>

                  {/* Actions for Staff */}
                  {!isCustomer && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedTicket.assigned_agent?.id || ''}
                        onChange={(e) => handleAssignAgent(e.target.value)}
                        className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-700"
                      >
                        <option value="">Unassigned</option>
                        {agentList.map((m) => (
                          <option key={m.id} value={m.id}>{m.full_name}</option>
                        ))}
                      </select>

                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                        className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-700"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting">Waiting on Customer</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  )}
                </div>

                <h2 className="text-lg font-bold text-slate-900 mb-1">{selectedTicket.title}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>Customer: <strong className="text-slate-700">{selectedTicket.customer.full_name}</strong> ({selectedTicket.customer.email})</span>
                  <span>Assigned: <strong className="text-slate-700">{selectedTicket.assigned_agent?.full_name || 'Unassigned'}</strong></span>
                </div>
              </div>

              {/* Thread Messages */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-slate-900">{selectedTicket.customer.full_name} (Initial Request)</span>
                    <span className="text-[11px] text-slate-400">{new Date(selectedTicket.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {selectedTicket.messages && selectedTicket.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-xl border shadow-sm ${
                      m.message_type === 'internal_note'
                        ? 'bg-amber-50/80 border-amber-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-slate-900">{m.author.full_name}</span>
                        {m.message_type === 'internal_note' && (
                          <span className="flex items-center space-x-1 text-[10px] font-bold uppercase bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                            <Lock className="w-3 h-3" />
                            <span>Internal Agent Note</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="p-4 bg-white border-t border-slate-200">
                {!isCustomer && (
                  <div className="flex space-x-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setReplyType('public_reply')}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md transition ${
                        replyType === 'public_reply'
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Public Reply (To Customer)
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyType('internal_note')}
                      className={`flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-md transition ${
                        replyType === 'internal_note'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                      <span>Internal Note (Private)</span>
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendReply}>
                  <textarea
                    rows={3}
                    required
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={
                      replyType === 'internal_note'
                        ? 'Type a private note for other agents (customer cannot see this)...'
                        : 'Type your official reply to the customer...'
                    }
                    className={`w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                      replyType === 'internal_note'
                        ? 'bg-amber-50/30 border-amber-300 focus:ring-amber-500'
                        : 'border-slate-300 focus:ring-brand-500'
                    }`}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={sendingReply}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{sendingReply ? 'Posting...' : 'Send Message'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <MessageSquare className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300" />
              <p className="text-sm font-medium">Select a ticket from the left to view the conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal Dialog */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Create Support Ticket</h2>
            <p className="text-xs text-slate-500 mb-4">Submit a new customer issue for triage & resolution</p>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Treadmill belt motor stopped"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* Customer Selection for Staff */}
              {!isCustomer && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Customer (On Behalf Of)
                    </label>
                    <select
                      value={newCustomerId}
                      onChange={(e) => setNewCustomerId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="">Myself ({user?.full_name})</option>
                      {customerList.map((c) => (
                        <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Assign To Agent
                    </label>
                    <select
                      value={newAgentId}
                      onChange={(e) => setNewAgentId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="">Unassigned</option>
                      {agentList.map((a) => (
                        <option key={a.id} value={a.id}>{a.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="low">Low (48h SLA)</option>
                  <option value="medium">Medium (24h SLA)</option>
                  <option value="high">High (12h SLA)</option>
                  <option value="urgent">Urgent (4h SLA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  rows={4}
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Provide full details of the problem..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 shadow"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
