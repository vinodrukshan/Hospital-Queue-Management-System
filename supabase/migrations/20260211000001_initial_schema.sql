-- Project G05: Hospital Queue Management System
-- Initial Schema Migration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES & ROLES
CREATE TYPE user_role AS ENUM (
  'patient',
  'doctor',
  'receptionist',
  'hospital_admin',
  'clinic_head',
  'technical_maintainer'
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'patient',
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  national_id TEXT,
  staff_id TEXT UNIQUE,
  specialty TEXT,
  clinic_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. CLINICS
CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- e.g. 'OPD', 'PED', 'CARD', 'ENT'
  department TEXT NOT NULL,
  rooms TEXT[] DEFAULT ARRAY[]::TEXT[],
  operating_hours JSONB DEFAULT '{"start": "08:00", "end": "16:00"}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_daily_tokens INTEGER NOT NULL DEFAULT 150,
  current_token_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Foreign key on profiles.clinic_id
ALTER TABLE public.profiles 
  ADD CONSTRAINT fk_profiles_clinic 
  FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL;

-- 3. DOCTOR CLINICS ASSIGNMENT
CREATE TABLE IF NOT EXISTS public.doctor_clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  room_number TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(doctor_id, clinic_id)
);

-- 4. PATIENTS (Patient specific details)
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL UNIQUE, -- MRN / Hospital Number, e.g. PAT-2026-001
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  blood_group TEXT,
  allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
  emergency_contact TEXT,
  emergency_phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. APPOINTMENTS
CREATE TYPE appointment_status AS ENUM (
  'scheduled',
  'checked_in',
  'cancelled',
  'completed',
  'no_show'
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_number TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. VISITS
CREATE TABLE IF NOT EXISTS public.visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_number TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  status TEXT NOT NULL DEFAULT 'checked_in',
  is_walk_in BOOLEAN NOT NULL DEFAULT false,
  check_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. QUEUE ENTRIES
CREATE TYPE queue_status AS ENUM (
  'waiting',
  'called',
  'recalled',
  'consulting',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE priority_level AS ENUM (
  'normal',
  'elderly',
  'child',
  'urgent'
);

CREATE TABLE IF NOT EXISTS public.queue_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_number TEXT NOT NULL, -- e.g. A001, B015
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  priority priority_level NOT NULL DEFAULT 'normal',
  status queue_status NOT NULL DEFAULT 'waiting',
  counter_or_room TEXT,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  called_at TIMESTAMPTZ,
  recalled_at TIMESTAMPTZ,
  recall_count INTEGER NOT NULL DEFAULT 0,
  consultation_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_queue_clinic_status ON public.queue_entries(clinic_id, status);
CREATE INDEX idx_queue_patient ON public.queue_entries(patient_id);
CREATE INDEX idx_queue_doctor ON public.queue_entries(doctor_id);
CREATE INDEX idx_queue_token ON public.queue_entries(token_number);

-- 8. QUEUE EVENTS (Audit & history tracking)
CREATE TABLE IF NOT EXISTS public.queue_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_entry_id UUID NOT NULL REFERENCES public.queue_entries(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'generated', 'called', 'recalled', 'consulting_started', 'completed', 'cancelled'
  previous_status queue_status,
  new_status queue_status NOT NULL,
  triggered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. CONSULTATIONS
CREATE TABLE IF NOT EXISTS public.consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_entry_id UUID REFERENCES public.queue_entries(id) ON DELETE SET NULL,
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  chief_complaint TEXT,
  symptoms TEXT,
  clinical_notes TEXT,
  diagnosis TEXT NOT NULL,
  allergies_noted TEXT,
  vitals JSONB DEFAULT '{}'::jsonb, -- e.g. { bp: '120/80', pulse: 72, temp: '36.8' }
  follow_up_date DATE,
  consultation_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  consultation_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. PRESCRIPTIONS & PRESCRIPTION ITEMS
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes TEXT,
  is_dispensed BOOLEAN NOT NULL DEFAULT false,
  dispensed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.prescription_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL, -- e.g. "Twice daily after food"
  duration TEXT NOT NULL,  -- e.g. "5 days"
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. MEDICAL RECORDS & LABORATORY REPORTS
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  record_type TEXT NOT NULL, -- 'diagnosis', 'allergy', 'immunization', 'history'
  title TEXT NOT NULL,
  description TEXT,
  date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.laboratory_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_number TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  test_name TEXT NOT NULL,
  test_category TEXT NOT NULL, -- 'Hematology', 'Biochemistry', 'Microbiology', 'Radiology'
  status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  result_summary TEXT NOT NULL,
  results_data JSONB DEFAULT '[]'::jsonb,
  document_url TEXT,
  is_authorized BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'token_generated', 'queue_call', 'recall', 'consultation_complete', 'appointment_reminder', 'system_alert'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_id UUID,
  related_entity_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_notifications_recipient_unread ON public.notifications(recipient_id, is_read);

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. DEVICES (Scanners, Printers, Queue Displays)
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('scanner', 'printer', 'display')),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  ip_or_identifier TEXT,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'error')),
  last_ping TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. SYSTEM HEALTH LOGS
CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component TEXT NOT NULL, -- 'database', 'realtime', 'auth', 'display_sync', 'queue_engine'
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unreachable')),
  response_time_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Automatically update updated_at trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_clinics_modtime BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_appointments_modtime BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_queue_entries_modtime BEFORE UPDATE ON public.queue_entries FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_devices_modtime BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
