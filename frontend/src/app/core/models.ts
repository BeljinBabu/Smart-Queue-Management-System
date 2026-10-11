export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
}

export interface Service {
  _id: string;
  name: string;
  code: string;
  department: string;
  description: string;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  workingDays: number[];
  isActive: boolean;
}

export type Status = 'BOOKED' | 'CALLED' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';

export interface Appointment {
  _id: string;
  user: any;
  service: any;
  date: string;
  slot: string;
  tokenNumber: number;
  tokenCode: string;
  status: Status;
  notes: string;
  calledAt: string | null;
  completedAt: string | null;
}

export interface Slot {
  time: string;
  available: boolean;
  reason: string | null;
}

export interface SlotsResponse {
  date: string;
  closed: boolean;
  slots: Slot[];
}

export interface QueueInfo {
  appointment: Appointment;
  nowServing: string | null;
  lastCompleted: string | null;
  waitingTotal: number;
  ahead: number;
  estimatedWaitMins: number;
}

export interface Stats {
  users: number;
  activeServices: number;
  totalAppointments: number;
  byStatus: Record<string, number>;
  today: { total: number; waiting: number; serving: number; completed: number; cancelled: number };
  byService: { name: string; code: string; count: number }[];
  last7Days: { date: string; count: number }[];
  avgServiceMinutes: number;
}
