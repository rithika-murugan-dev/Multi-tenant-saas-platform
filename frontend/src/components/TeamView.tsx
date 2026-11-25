import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { User, UserRole } from '../types';
import { UserPlus, Mail } from 'lucide-react';

export const TeamView: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('agent');

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await api.users.list();
      setMembers(data);
    } catch (err) {
      console.error('Failed to load team:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.users.create({
        email,
        full_name: fullName,
        password,
        role,
      });
      setShowModal(false);
      setEmail('');
      setFullName('');
      setPassword('');
      fetchMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to add employee');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Team & Roles</h1>
          <p className="text-sm text-slate-500">Manage support agents, warehouse technicians & managers</p>
        </div>

        {user?.role === 'tenant_admin' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Company Directory ({members.length} Members)
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading team...</div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                    {m.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{m.full_name}</h4>
                    <p className="text-xs text-slate-500 flex items-center space-x-1">
                      <Mail className="w-3 h-3" />
                      <span>{m.email}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {m.role.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400">
                    Joined {new Date(m.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Add Team Member</h2>
            <p className="text-xs text-slate-500 mb-4">Grant platform access to an employee or manager</p>

            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Role & Permissions</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="agent">Agent (Handle tickets & operations)</option>
                  <option value="manager">Manager (Assign tickets & view reports)</option>
                  <option value="customer">Customer (External client submitting tickets)</option>
                </select>
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
                  Add to Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
