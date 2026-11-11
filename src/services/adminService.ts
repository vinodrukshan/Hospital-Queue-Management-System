import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, UserRole, Device, SystemHealthLog } from '../types/database';
import { INITIAL_PROFILES, INITIAL_DEVICES, INITIAL_HEALTH_LOGS, INITIAL_CLINICS } from './mockDataStore';

export const adminService = {
  async getStaffList(): Promise<Profile[]> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'patient')
        .order('role');
      if (data) return data as Profile[];
    }
    return INITIAL_PROFILES.filter(p => p.role !== 'patient');
  },

  async updateStaffStatus(id: string, isActive: boolean): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', id);
      return !error;
    }
    const staff = INITIAL_PROFILES.find(p => p.id === id);
    if (staff) {
      staff.is_active = isActive;
      staff.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  },

  async updateStaffRole(id: string, newRole: UserRole, clinicId?: string, specialty?: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, clinic_id: clinicId || null, specialty: specialty || null })
        .eq('id', id);
      return !error;
    }
    const staff = INITIAL_PROFILES.find(p => p.id === id);
    if (staff) {
      staff.role = newRole;
      if (clinicId !== undefined) staff.clinic_id = clinicId;
      if (specialty !== undefined) staff.specialty = specialty;
      staff.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  },

  async createStaffMember(data: {
    fullName: string;
    email: string;
    phone: string;
    role: UserRole;
    staffId: string;
    specialty?: string;
    clinicId?: string;
  }): Promise<{ success: boolean; data?: Profile; message?: string }> {
    const existing = INITIAL_PROFILES.find(p => p.staff_id === data.staffId || p.email === data.email);
    if (existing) {
      return { success: false, message: `A staff member with ID ${data.staffId} or email ${data.email} already exists.` };
    }

    const newStaff: Profile = {
      id: 'u-' + Math.random().toString(36).substring(2, 9),
      role: data.role,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      staff_id: data.staffId,
      specialty: data.specialty,
      clinic_id: data.clinicId,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('profiles').insert([newStaff]);
      if (error) return { success: false, message: error.message };
    }

    INITIAL_PROFILES.push(newStaff);
    return { success: true, data: newStaff };
  },

  async getDevices(): Promise<Device[]> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('devices').select('*').order('name');
      if (data) return data as Device[];
    }
    return [...INITIAL_DEVICES];
  },

  async getSystemHealthLogs(): Promise<SystemHealthLog[]> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('system_health_logs').select('*').order('created_at', { ascending: false }).limit(20);
      if (data) return data as SystemHealthLog[];
    }
    return [...INITIAL_HEALTH_LOGS];
  },

  async logSystemHealth(component: string, status: 'healthy' | 'degraded' | 'unreachable', responseTime: number, errorMsg?: string) {
    const entry: SystemHealthLog = {
      id: 'sh-' + Math.random().toString(36).substring(2, 9),
      component,
      status,
      response_time_ms: responseTime,
      error_message: errorMsg,
      created_at: new Date().toISOString(),
    };
    INITIAL_HEALTH_LOGS.unshift(entry);
  },
};
