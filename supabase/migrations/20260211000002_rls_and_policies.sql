-- Project G05: Hospital Queue Management System
-- Row Level Security (RLS) & Policies

-- Helper functions to extract role and clinic
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratory_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Staff can view relevant profiles"
  ON public.profiles FOR SELECT
  USING (
    public.get_auth_role() IN ('doctor', 'receptionist', 'clinic_head', 'hospital_admin', 'technical_maintainer')
  );

CREATE POLICY "Hospital Admin can manage staff profiles"
  ON public.profiles FOR ALL
  USING (public.get_auth_role() = 'hospital_admin');

CREATE POLICY "Users can update own contact info"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Cannot elevate role
  );

-- 2. CLINICS POLICIES
CREATE POLICY "Clinics are readable by authenticated users and public"
  ON public.clinics FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage clinics"
  ON public.clinics FOR ALL
  USING (public.get_auth_role() = 'hospital_admin');

CREATE POLICY "Clinic Heads can update their assigned clinic"
  ON public.clinics FOR UPDATE
  USING (public.get_auth_role() = 'clinic_head' AND id = public.get_auth_clinic_id());

-- 3. DOCTOR_CLINICS POLICIES
CREATE POLICY "Doctor clinics readable by all"
  ON public.doctor_clinics FOR SELECT
  USING (true);

CREATE POLICY "Hospital Admin can manage doctor clinics"
  ON public.doctor_clinics FOR ALL
  USING (public.get_auth_role() = 'hospital_admin');

-- 4. PATIENTS POLICIES
CREATE POLICY "Patients can view own patient record"
  ON public.patients FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Clinical & reception staff can view patients"
  ON public.patients FOR SELECT
  USING (public.get_auth_role() IN ('doctor', 'receptionist', 'hospital_admin', 'clinic_head'));

CREATE POLICY "Receptionist can insert/update patient demographics"
  ON public.patients FOR INSERT
  WITH CHECK (public.get_auth_role() IN ('receptionist', 'hospital_admin'));

CREATE POLICY "Receptionist can update patient demographics"
  ON public.patients FOR UPDATE
  USING (public.get_auth_role() IN ('receptionist', 'hospital_admin'));

-- 5. APPOINTMENTS POLICIES
CREATE POLICY "Patient can view own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctor can view assigned or clinic appointments"
  ON public.appointments FOR SELECT
  USING (
    public.get_auth_role() = 'doctor' AND 
    (doctor_id = auth.uid() OR clinic_id = public.get_auth_clinic_id())
  );

CREATE POLICY "Receptionist and Admin can manage appointments"
  ON public.appointments FOR ALL
  USING (public.get_auth_role() IN ('receptionist', 'hospital_admin'));

CREATE POLICY "Clinic Head can view clinic appointments"
  ON public.appointments FOR SELECT
  USING (public.get_auth_role() = 'clinic_head' AND clinic_id = public.get_auth_clinic_id());

-- 6. VISITS POLICIES
CREATE POLICY "Patient can view own visits"
  ON public.visits FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Receptionist can manage visits"
  ON public.visits FOR ALL
  USING (public.get_auth_role() IN ('receptionist', 'hospital_admin'));

CREATE POLICY "Doctor can view clinic visits"
  ON public.visits FOR SELECT
  USING (public.get_auth_role() IN ('doctor', 'clinic_head'));

-- 7. QUEUE_ENTRIES POLICIES
CREATE POLICY "Public display can view anonymized queue"
  ON public.queue_entries FOR SELECT
  USING (status IN ('waiting', 'called', 'recalled', 'consulting'));

CREATE POLICY "Patient can view own queue entries"
  ON public.queue_entries FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors and staff can view clinic queue entries"
  ON public.queue_entries FOR SELECT
  USING (public.get_auth_role() IN ('doctor', 'receptionist', 'clinic_head', 'hospital_admin'));

CREATE POLICY "Receptionist can insert queue entries"
  ON public.queue_entries FOR INSERT
  WITH CHECK (public.get_auth_role() IN ('receptionist', 'hospital_admin'));

CREATE POLICY "Doctors can update assigned clinic queue entries"
  ON public.queue_entries FOR UPDATE
  USING (public.get_auth_role() IN ('doctor', 'hospital_admin', 'receptionist'));

-- 8. QUEUE_EVENTS POLICIES
CREATE POLICY "Staff can view queue events"
  ON public.queue_events FOR SELECT
  USING (public.get_auth_role() IN ('doctor', 'receptionist', 'clinic_head', 'hospital_admin', 'technical_maintainer'));

CREATE POLICY "Staff can insert queue events"
  ON public.queue_events FOR INSERT
  WITH CHECK (public.get_auth_role() IN ('doctor', 'receptionist', 'hospital_admin'));

-- 9. CONSULTATIONS & MEDICAL RECORDS POLICIES (Strict Privacy)
CREATE POLICY "Patient can view own consultations"
  ON public.consultations FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view and manage consultations"
  ON public.consultations FOR ALL
  USING (public.get_auth_role() = 'doctor');

CREATE POLICY "Patient can view own prescriptions"
  ON public.prescriptions FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can manage prescriptions"
  ON public.prescriptions FOR ALL
  USING (public.get_auth_role() = 'doctor');

CREATE POLICY "Patient can view own prescription items"
  ON public.prescription_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prescriptions p 
      WHERE p.id = prescription_id AND p.patient_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can manage prescription items"
  ON public.prescription_items FOR ALL
  USING (public.get_auth_role() = 'doctor');

CREATE POLICY "Patient can view own medical records"
  ON public.medical_records FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view and add medical records"
  ON public.medical_records FOR ALL
  USING (public.get_auth_role() = 'doctor');

CREATE POLICY "Patient can view own authorized lab reports"
  ON public.laboratory_reports FOR SELECT
  USING (auth.uid() = patient_id AND is_authorized = true);

CREATE POLICY "Doctors can view and manage lab reports"
  ON public.laboratory_reports FOR ALL
  USING (public.get_auth_role() = 'doctor');

-- 10. NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update own notification read status"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "System and staff can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- 11. AUDIT, DEVICES & SYSTEM HEALTH
CREATE POLICY "Maintainer and Admin can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.get_auth_role() IN ('hospital_admin', 'technical_maintainer'));

CREATE POLICY "All users can append audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Maintainer and Admin can manage devices"
  ON public.devices FOR ALL
  USING (public.get_auth_role() IN ('technical_maintainer', 'hospital_admin'));

CREATE POLICY "Staff can view device status"
  ON public.devices FOR SELECT
  USING (public.get_auth_role() IN ('doctor', 'receptionist', 'clinic_head'));

CREATE POLICY "Maintainer and Admin can manage system health logs"
  ON public.system_health_logs FOR ALL
  USING (public.get_auth_role() IN ('technical_maintainer', 'hospital_admin'));
