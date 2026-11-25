import { AnalyticsOverview, KanbanBoard, Task, Tenant, Ticket, User } from '../types';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      // Non-JSON response
    }
    throw new ApiError(errorDetail, response.status);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  auth: {
    login: async (email: string, password: string, tenant_slug: string) => {
      return request<{ access_token: string; token_type: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, tenant_slug }),
      });
    },
    register: async (payload: {
      company_name: string;
      slug: string;
      admin_name: string;
      admin_email: string;
      admin_password: string;
    }) => {
      return request<{
        tenant: Tenant;
        admin_user: User;
        access_token: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getMe: async () => {
      return request<User>('/auth/me');
    },
  },

  tenants: {
    getCurrent: async () => {
      return request<Tenant>('/tenants/current');
    },
  },

  users: {
    list: async () => {
      return request<User[]>('/users/');
    },
    create: async (data: { email: string; full_name: string; password: string; role: string }) => {
      return request<User>('/users/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  tickets: {
    list: async (status?: string, priority?: string) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<Ticket[]>(`/tickets/${query}`);
    },
    get: async (ticketId: string) => {
      return request<Ticket>(`/tickets/${ticketId}`);
    },
    create: async (data: {
      title: string;
      description: string;
      priority: string;
      customer_id?: string;
      assigned_agent_id?: string;
      due_at?: string;
    }) => {
      return request<Ticket>('/tickets/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (ticketId: string, data: Partial<Ticket> & { assigned_agent_id?: string }) => {
      return request<Ticket>(`/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    postMessage: async (ticketId: string, content: string, message_type: 'public_reply' | 'internal_note') => {
      return request(`/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, message_type }),
      });
    },
    uploadAttachment: async (ticketId: string, file: File) => {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/attachments`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to upload attachment');
      }
      return response.json();
    },
  },

  tasks: {
    list: async (status?: string) => {
      const query = status ? `?status=${status}` : '';
      return request<Task[]>(`/tasks/${query}`);
    },
    getKanban: async () => {
      return request<KanbanBoard>('/tasks/kanban');
    },
    create: async (data: {
      title: string;
      description?: string;
      priority: string;
      ticket_id?: string;
      assignee_id?: string;
      estimated_hours?: number;
      due_date?: string;
    }) => {
      return request<Task>('/tasks/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (taskId: string, data: Partial<Task> & { assignee_id?: string }) => {
      return request<Task>(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (taskId: string) => {
      return request<void>(`/tasks/${taskId}`, {
        method: 'DELETE',
      });
    },
  },

  analytics: {
    getOverview: async () => {
      return request<AnalyticsOverview>('/analytics/overview');
    },
  },
};
