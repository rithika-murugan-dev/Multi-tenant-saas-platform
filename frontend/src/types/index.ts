export type UserRole = 'superadmin' | 'tenant_admin' | 'manager' | 'agent' | 'customer';

export interface User {
  id: string;
  tenant_id?: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  plan: string;
  is_active: boolean;
}

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketChannel = 'web' | 'email' | 'internal' | 'api';
export type MessageType = 'public_reply' | 'internal_note';

export interface UserSummary {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author: UserSummary;
  content: string;
  message_type: MessageType;
  created_at: string;
}

export interface Ticket {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: TicketChannel;
  customer: UserSummary;
  assigned_agent?: UserSummary | null;
  due_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  messages?: TicketMessage[];
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  ticket?: {
    id: string;
    title: string;
    status: TicketStatus;
  } | null;
  creator: UserSummary;
  assignee?: UserSummary | null;
  due_date?: string | null;
  completed_at?: string | null;
  estimated_hours?: number | null;
  logged_hours: number;
  created_at: string;
  updated_at: string;
}

export interface KanbanBoard {
  todo: Task[];
  in_progress: Task[];
  in_review: Task[];
  done: Task[];
  cancelled: Task[];
}

export interface PriorityDistribution {
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

export interface StatusDistribution {
  open: number;
  in_progress: number;
  waiting: number;
  resolved: number;
  closed: number;
}

export interface AgentPerformance {
  agent_id: string;
  full_name: string;
  email: string;
  tickets_assigned: number;
  tickets_resolved: number;
  tasks_completed: number;
  total_logged_hours: number;
}

export interface AnalyticsOverview {
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  sla_compliance_rate: number;
  avg_resolution_time_hours: number;
  tickets_by_priority: PriorityDistribution;
  tickets_by_status: StatusDistribution;
  total_tasks: number;
  completed_tasks: number;
  total_logged_hours: number;
  agent_leaderboard: AgentPerformance[];
}
