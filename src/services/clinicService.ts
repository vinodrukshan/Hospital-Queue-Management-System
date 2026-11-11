import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Clinic, Profile } from '../types/database';
import { INITIAL_CLINICS, INITIAL_PROFILES } from './mockDataStore';

export const clinicService = {
  async getClinics(): Promise<Clinic[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('clinics').select('*').order('name');
      if (!error && data) return data as Clinic[];
    }
    return [...INITIAL_CLINICS];
  },

  async getClinicById(id: string): Promise<Clinic | undefined> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('clinics').select('*').eq('id', id).single();
      if (data) return data as Clinic;
    }
    return INITIAL_CLINICS.find(c => c.id === id);
  },

  async getClinicDoctors(clinicId: string): Promise<Profile[]> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'doctor')
        .eq('clinic_id', clinicId);
      if (data) return data as Profile[];
    }
    return INITIAL_PROFILES.filter(p => p.role === 'doctor' && p.clinic_id === clinicId);
  },

  async updateClinic(id: string, updates: Partial<Clinic>): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('clinics').update(updates).eq('id', id);
      return !error;
    }
    const idx = INITIAL_CLINICS.findIndex(c => c.id === id);
    if (idx !== -1) {
      INITIAL_CLINICS[idx] = { ...INITIAL_CLINICS[idx], ...updates, updated_at: new Date().toISOString() };
      return true;
    }
    return false;
  },
};
