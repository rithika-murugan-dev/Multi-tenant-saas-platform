import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Tenant, User } from '../types';

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, tenant_slug: string) => Promise<void>;
  register: (payload: {
    company_name: string;
    slug: string;
    admin_name: string;
    admin_email: string;
    admin_password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadIdentity() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await api.auth.getMe();
        setUser(me);
        const t = await api.tenants.getCurrent();
        setTenant(t);
      } catch (err) {
        console.error('Failed to authenticate session:', err);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setTenant(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadIdentity();
  }, [token]);

  const login = async (email: string, password: string, tenant_slug: string) => {
    const res = await api.auth.login(email, password, tenant_slug);
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    const me = await api.auth.getMe();
    setUser(me);
    const t = await api.tenants.getCurrent();
    setTenant(t);
  };

  const register = async (payload: {
    company_name: string;
    slug: string;
    admin_name: string;
    admin_email: string;
    admin_password: string;
  }) => {
    const res = await api.auth.register(payload);
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    setUser(res.admin_user);
    setTenant(res.tenant);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setTenant(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
