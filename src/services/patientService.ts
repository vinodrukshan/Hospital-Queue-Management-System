import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Patient, Profile, Appointment, Consultation, LaboratoryReport } from '../types/database';
import { 
  INITIAL_PATIENTS, 
  INITIAL_PROFILES, 
  INITIAL_APPOINTMENTS, 
  INITIAL_CONSULTATIONS, 
  INITIAL_LAB_REPORTS,
  INITIAL_CLINICS
} from './mockDataStore';

export const patientService = {
  async searchPatients(term: string): Promise<Array<Profile & { patient_data?: Patient }>> {
    const cleanTerm = term.trim().toLowerCase();
    if (!cleanTerm) return [];

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          patients(*)
        `)
        .eq('role', 'patient')
        .or(`full_name.ilike.%${cleanTerm}%,phone.ilike.%${cleanTerm}%,national_id.ilike.%${cleanTerm}%`);

      if (!error && data) {
        return data as any;
      }
    }

    // Local search
    const matchedProfiles = INITIAL_PROFILES.filter(p => {
      if (p.role !== 'patient') return false;
      const matchName = p.full_name.toLowerCase().includes(cleanTerm);
      const matchPhone = p.phone ? p.phone.toLowerCase().includes(cleanTerm) : false;
      const matchNIC = p.national_id ? p.national_id.toLowerCase().includes(cleanTerm) : false;
      
      const pDetails = INITIAL_PATIENTS.find(pt => pt.id === p.id);
      const matchMRN = pDetails ? pDetails.patient_id.toLowerCase().includes(cleanTerm) : false;
      return matchName || matchPhone || matchNIC || matchMRN;
    });

    return matchedProfiles.map(p => ({
      ...p,
      patient_data: INITIAL_PATIENTS.find(pt => pt.id === p.id),
    }));
  },

  async registerPatient(data: {
    fullName: string;
    phone: string;
    nationalId?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    bloodGroup?: string;
    allergies?: string[];
    emergencyContact?: string;
    emergencyPhone?: string;
    address?: string;
  }): Promise<{ success: boolean; data?: Profile; message?: string; warning?: string }> {
    // Check duplicates by phone or nationalId
    const existing = INITIAL_PROFILES.find(p => 
      p.role === 'patient' && (
        (p.phone && p.phone === data.phone) ||
        (data.nationalId && p.national_id && p.national_id === data.nationalId)
      )
    );

    if (existing) {
      return { 
        success: false, 
        message: `A patient with phone '${data.phone}' or NIC '${data.nationalId}' already exists (${existing.full_name}).` 
      };
    }

    const newId = 'u-' + Math.random().toString(36).substring(2, 9);
    const newMRN = 'PAT-2026-' + String(Math.floor(1000 + Math.random() * 9000));

    const newProfile: Profile = {
      id: newId,
      role: 'patient',
      full_name: data.fullName,
      phone: data.phone,
      national_id: data.nationalId,
      email: `patient.${newMRN.toLowerCase()}@idh.hospital.lk`,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newPatient: Patient = {
      id: newId,
      patient_id: newMRN,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      blood_group: data.bloodGroup,
      allergies: data.allergies || [],
      emergency_contact: data.emergencyContact,
      emergency_phone: data.emergencyPhone,
      address: data.address,
      created_at: new Date().toISOString(),
    };

    INITIAL_PROFILES.push(newProfile);
    INITIAL_PATIENTS.push(newPatient);

    return { success: true, data: newProfile };
  },

  async getPatientProfile(patientId: string): Promise<{ profile: Profile; details?: Patient } | null> {
    const profile = INITIAL_PROFILES.find(p => p.id === patientId);
    if (!profile) return null;
    const details = INITIAL_PATIENTS.find(pt => pt.id === patientId);
    return { profile, details };
  },

  async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('appointments')
        .select(`
          *,
          clinic:clinic_id(id, name, code),
          doctor:doctor_id(id, full_name, specialty)
        `)
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false });

      if (data) return data as unknown as Appointment[];
    }

    return INITIAL_APPOINTMENTS
      .filter(a => a.patient_id === patientId)
      .map(a => ({
        ...a,
        clinic: INITIAL_CLINICS.find(c => c.id === a.clinic_id),
        doctor: a.doctor_id ? INITIAL_PROFILES.find(p => p.id === a.doctor_id) : undefined,
      }));
  },

  async getPatientConsultations(patientId: string): Promise<Consultation[]> {
    return INITIAL_CONSULTATIONS
      .filter(c => c.patient_id === patientId)
      .map(c => ({
        ...c,
        clinic: INITIAL_CLINICS.find(cl => cl.id === c.clinic_id),
        doctor: INITIAL_PROFILES.find(doc => doc.id === c.doctor_id),
      }));
  },

  async getPatientLabReports(patientId: string): Promise<LaboratoryReport[]> {
    return INITIAL_LAB_REPORTS.filter(r => r.patient_id === patientId && r.is_authorized);
  },
};
