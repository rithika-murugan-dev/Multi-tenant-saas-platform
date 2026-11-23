import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, ShieldCheck, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginTenantSlug, setLoginTenantSlug] = useState('apex-logistics');

  // Register form state
  const [companyName, setCompanyName] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(loginEmail, loginPassword, loginTenantSlug);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        company_name: companyName,
        slug: companySlug.toLowerCase(),
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Check company slug.');
    } finally {
      setLoading(false);
    }
  };

  // Demo auto-fill helpers for the user
  const fillSarah = () => {
    setIsRegistering(false);
    setLoginTenantSlug('apex-logistics');
    setLoginEmail('sarah@apexlogistics.com');
    setLoginPassword('SecurePassword123!');
  };

  const fillJohn = () => {
    setIsRegistering(false);
    setLoginTenantSlug('apex-logistics');
    setLoginEmail('john.customer@gmail.com');
    setLoginPassword('CustomerPassword123!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-brand-600 text-white rounded-2xl shadow-xl shadow-brand-500/20 mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          WorkFlow Pro
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Multi-Tenant Helpdesk, Jira Operations & Business Analytics
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              onClick={() => { setIsRegistering(false); setError(null); }}
              className={`flex-1 pb-3 font-semibold text-sm text-center border-b-2 transition ${
                !isRegistering
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <LogIn className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              Sign In
            </button>
            <button
              onClick={() => { setIsRegistering(true); setError(null); }}
              className={`flex-1 pb-3 font-semibold text-sm text-center border-b-2 transition ${
                isRegistering
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <UserPlus className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              Register Company
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {!isRegistering ? (
            /* LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Company ID (Slug)
                </label>
                <input
                  type="text"
                  required
                  value={loginTenantSlug}
                  onChange={(e) => setLoginTenantSlug(e.target.value)}
                  placeholder="e.g. apex-logistics"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg text-sm shadow transition disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Log In to Workspace'}
              </button>

              {/* One-Click Quick Fill Demo Users */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2 font-medium">Quick Demo Autofill:</p>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={fillSarah}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded"
                  >
                    Sarah (Admin)
                  </button>
                  <button
                    type="button"
                    onClick={fillJohn}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded"
                  >
                    John (Customer)
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* REGISTER COMPANY FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Logistics Inc"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Unique Company Slug
                </label>
                <input
                  type="text"
                  required
                  value={companySlug}
                  onChange={(e) => setCompanySlug(e.target.value)}
                  placeholder="e.g. apex-logistics"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Admin Full Name
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Sarah Connor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="sarah@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg text-sm shadow transition disabled:opacity-50"
              >
                {loading ? 'Creating Organization...' : 'Create SaaS Tenant'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
