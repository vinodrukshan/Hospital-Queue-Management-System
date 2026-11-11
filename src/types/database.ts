export type UserRole = 
  | 'patient'
  | 'doctor'
  | 'receptionist'
  | 'hospital_admin'
  | 'clinic_head'
  | 'technical_maintainer';

export type QueueStatus = 
  | 'waiting'
  | 'called'
  | 'recalled'
  | 'consulting'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type PriorityLevel = 
  | 'normal'
  | 'elderly'
  | 'child'
  | 'urgent';

export type AppointmentStatus = 
  | 'scheduled'
  | 'checked_in'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type DeviceType = 'scanner' | 'printer' | 'display';
export type DeviceStatus = 'online' | 'offline' | 'error';
export type SystemHealthStatus = 'healthy' | 'degraded' | 'unreachable';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email?: string;
  phone?: string;
  national_id?: string;
  staff_id?: string;
  specialty?: string;
  clinic_id?: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Clinic {
  id: string;
  name: string;
  code: string;
  department: string;
  rooms: string[];
  operating_hours: {
    start: string;
    end: string;
  };
  is_active: boolean;
  max_daily_tokens: number;
  current_token_sequence: number;
  created_at: string;
  updated_at: string;
}

export interface DoctorClinic {
  id: string;
  doctor_id: string;
  clinic_id: string;
  room_number?: string;
  is_available: boolean;
  created_at: string;
  doctor?: Profile;
  clinic?: Clinic;
}

export interface Patient {
  id: string;
  patient_id: string; // Hospital MRN e.g. PAT-2026-0042
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  blood_group?: string;
  allergies?: string[];
  emergency_contact?: string;
  emergency_phone?: string;
  address?: string;
  created_at: string;
  profile?: Profile;
}

export interface Appointment {
  id: string;
  appointment_number: string;
  patient_id: string;
  clinic_id: string;
  doctor_id?: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  patient?: Profile;
  clinic?: Clinic;
  doctor?: Profile;
}

export interface Visit {
  id: string;
  visit_number: string;
  patient_id: string;
  clinic_id: string;
  doctor_id?: string;
  appointment_id?: string;
  visit_date: string;
  check_in_time: string;
  status: string;
  is_walk_in: boolean;
  check_in_by?: string;
  created_at: string;
  patient?: Profile;
  clinic?: Clinic;
  doctor?: Profile;
}

export interface QueueEntry {
  id: string;
  token_number: string;
  clinic_id: string;
  doctor_id?: string;
  visit_id: string;
  patient_id: string;
  sequence_number: number;
  priority: PriorityLevel;
  status: QueueStatus;
  counter_or_room?: string;
  checked_in_at: string;
  called_at?: string;
  recalled_at?: string;
  recall_count: number;
  consultation_started_at?: string;
  completed_at?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  created_at: string;
  updated_at: string;
  patient?: Profile;
  clinic?: Clinic;
  doctor?: Profile;
}

export interface QueueEvent {
  id: string;
  queue_entry_id: string;
  clinic_id: string;
  event_type: 'generated' | 'called' | 'recalled' | 'consulting_started' | 'completed' | 'cancelled';
  previous_status?: QueueStatus;
  new_status: QueueStatus;
  triggered_by?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface Consultation {
  id: string;
  queue_entry_id?: string;
  visit_id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  chief_complaint?: string;
  symptoms?: string;
  clinical_notes?: string;
  diagnosis: string;
  allergies_noted?: string;
  vitals?: {
    bp?: string;
    pulse?: number;
    temp?: string;
    spo2?: number;
    weight?: string;
  };
  follow_up_date?: string;
  consultation_start: string;
  consultation_end?: string;
  created_at: string;
  doctor?: Profile;
  clinic?: Clinic;
  prescriptions?: Prescription[];
}

export interface Prescription {
  id: string;
  consultation_id: string;
  patient_id: string;
  doctor_id: string;
  notes?: string;
  is_dispensed: boolean;
  dispensed_at?: string;
  created_at: string;
  items?: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  created_at: string;
}

export interface LaboratoryReport {
  id: string;
  report_number: string;
  patient_id: string;
  doctor_id?: string;
  clinic_id?: string;
  test_name: string;
  test_category: string;
  status: 'pending' | 'completed' | 'cancelled';
  report_date: string;
  result_summary: string;
  results_data?: Array<{ test: string; result: string; unit: string; reference_range: string }>;
  document_url?: string;
  is_authorized: boolean;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  recipient_id: string;
  type: 'token_generated' | 'queue_call' | 'recall' | 'consultation_complete' | 'appointment_reminder' | 'system_alert';
  title: string;
  message: string;
  related_entity_id?: string;
  related_entity_type?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  created_at: string;
  user?: Profile;
}

export interface Device {
  id: string;
  name: string;
  device_type: DeviceType;
  clinic_id?: string;
  ip_or_identifier?: string;
  status: DeviceStatus;
  last_ping: string;
  details?: Record<string, any>;
  created_at: string;
  updated_at: string;
  clinic?: Clinic;
}

export interface SystemHealthLog {
  id: string;
  component: string;
  status: SystemHealthStatus;
  response_time_ms: number;
  error_message?: string;
  details?: Record<string, any>;
  created_at: string;
}
