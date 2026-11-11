-- Project G05: Hospital Queue Management System
-- Fictional Seed Data for Development & Testing

-- 1. CLINICS
INSERT INTO public.clinics (id, name, code, department, rooms, operating_hours, max_daily_tokens, current_token_sequence)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'General Outpatient (OPD)', 'OPD', 'Outpatient Department', ARRAY['Room 101', 'Room 102', 'Room 103'], '{"start": "08:00", "end": "16:00"}'::jsonb, 200, 15),
  ('c0000000-0000-0000-0000-000000000002', 'Pediatric Clinic', 'PED', 'Pediatrics', ARRAY['Room 201', 'Room 202'], '{"start": "08:30", "end": "15:30"}'::jsonb, 100, 8),
  ('c0000000-0000-0000-0000-000000000003', 'Cardiology Clinic', 'CARD', 'Cardiovascular Diseases', ARRAY['Room 301'], '{"start": "09:00", "end": "14:00"}'::jsonb, 60, 5),
  ('c0000000-0000-0000-0000-000000000004', 'ENT & Infectious Diseases', 'ENT', 'Specialized Care', ARRAY['Room 401', 'Room 402'], '{"start": "08:00", "end": "16:00"}'::jsonb, 80, 4)
ON CONFLICT (id) DO NOTHING;

-- 2. PROFILES (FICTIONAL USERS FOR ALL 6 ROLES)
-- Doctor
INSERT INTO public.profiles (id, role, full_name, email, phone, staff_id, specialty, clinic_id)
VALUES
  ('u0000000-0000-0000-0000-000000000001', 'doctor', 'Dr. Aruni Senanayake', 'doctor@idh.hospital.lk', '+94 77 123 4567', 'DOC-0101', 'Senior Consultant Physician', 'c0000000-0000-0000-0000-000000000001'),
  ('u0000000-0000-0000-0000-000000000002', 'doctor', 'Dr. Kamal Perera', 'doctor.kamal@idh.hospital.lk', '+94 77 234 5678', 'DOC-0102', 'Consultant Pediatrician', 'c0000000-0000-0000-0000-000000000002'),
  
-- Receptionist
  ('u0000000-0000-0000-0000-000000000003', 'receptionist', 'Nimali Jayawardena', 'reception@idh.hospital.lk', '+94 77 345 6789', 'REC-001', 'Main Reception Counter', 'c0000000-0000-0000-0000-000000000001'),
  
-- Hospital Admin
  ('u0000000-0000-0000-0000-000000000004', 'hospital_admin', 'Director Sunil Fernando', 'admin@idh.hospital.lk', '+94 77 456 7890', 'ADM-001', 'Director of Hospital Operations', NULL),

-- Clinic Head
  ('u0000000-0000-0000-0000-000000000005', 'clinic_head', 'Dr. Priyantha Weerasinghe', 'clinichead@idh.hospital.lk', '+94 77 567 8901', 'CHD-001', 'Head of Outpatient Services', 'c0000000-0000-0000-0000-000000000001'),

-- Technical Maintainer
  ('u0000000-0000-0000-0000-000000000006', 'technical_maintainer', 'Ruwan Silva', 'maintainer@idh.hospital.lk', '+94 77 678 9012', 'MNT-001', 'Lead Systems Engineer', NULL),

-- Patients
  ('u0000000-0000-0000-0000-000000000007', 'patient', 'Kasun Bandara', 'patient@idh.hospital.lk', '+94 71 888 1234', NULL, NULL, NULL),
  ('u0000000-0000-0000-0000-000000000008', 'patient', 'Dilini Rodrigo', 'patient.dilini@idh.hospital.lk', '+94 71 999 5678', NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 3. PATIENTS DETAILS
INSERT INTO public.patients (id, patient_id, date_of_birth, gender, blood_group, allergies, emergency_contact, emergency_phone, address)
VALUES
  ('u0000000-0000-0000-0000-000000000007', 'PAT-2026-0042', '1988-06-15', 'male', 'O+', ARRAY['Penicillin', 'Sulfa drugs'], 'Sunethra Bandara (Spouse)', '+94 71 888 1235', '45 Galle Road, Colombo 03'),
  ('u0000000-0000-0000-0000-000000000008', 'PAT-2026-0099', '1995-11-23', 'female', 'B+', ARRAY['Aspirin'], 'Mahinda Rodrigo (Father)', '+94 71 999 5679', '12 Temple Lane, Rajagiriya')
ON CONFLICT (id) DO NOTHING;

-- 4. DOCTOR CLINICS ASSIGNMENTS
INSERT INTO public.doctor_clinics (doctor_id, clinic_id, room_number, is_available)
VALUES
  ('u0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Room 101', true),
  ('u0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'Room 201', true)
ON CONFLICT (doctor_id, clinic_id) DO NOTHING;

-- 5. APPOINTMENTS
INSERT INTO public.appointments (id, appointment_number, patient_id, clinic_id, doctor_id, appointment_date, appointment_time, status, reason)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'APT-2026-001', 'u0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', CURRENT_DATE, '09:00:00', 'checked_in', 'Routine respiratory follow-up'),
  ('a0000000-0000-0000-0000-000000000002', 'APT-2026-002', 'u0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', CURRENT_DATE, '09:30:00', 'scheduled', 'Persistent cough and mild fever'),
  ('a0000000-0000-0000-0000-000000000003', 'APT-2026-003', 'u0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003', NULL, CURRENT_DATE + INTERVAL '7 days', '10:00:00', 'scheduled', 'Cardiac stress checkup')
ON CONFLICT (id) DO NOTHING;

-- 6. VISITS
INSERT INTO public.visits (id, visit_number, patient_id, clinic_id, doctor_id, appointment_id, visit_date, check_in_time, status, check_in_by)
VALUES
  ('v0000000-0000-0000-0000-000000000001', 'VIS-2026-001', 'u0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE, timezone('utc'::text, now()) - INTERVAL '45 minutes', 'waiting', 'u0000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- 7. QUEUE ENTRIES
INSERT INTO public.queue_entries (id, token_number, clinic_id, doctor_id, visit_id, patient_id, sequence_number, priority, status, counter_or_room, checked_in_at)
VALUES
  ('q0000000-0000-0000-0000-000000000001', 'OPD015', 'c0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000007', 15, 'normal', 'waiting', 'Room 101', timezone('utc'::text, now()) - INTERVAL '40 minutes')
ON CONFLICT (id) DO NOTHING;

-- 8. CONSULTATIONS (Past history)
INSERT INTO public.consultations (id, visit_id, patient_id, doctor_id, clinic_id, chief_complaint, symptoms, clinical_notes, diagnosis, vitals, consultation_start, consultation_end)
VALUES
  ('cs000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000007', 'u0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Follow-up on allergic rhinitis', 'Nasal congestion, occasional wheeze', 'Patient responding well to second-line antihistamine. Lungs clear bilaterally.', 'Allergic Rhinitis (Controlled)', '{"bp": "122/82", "pulse": 76, "temp": "36.7", "spo2": 99}'::jsonb, timezone('utc'::text, now()) - INTERVAL '14 days', timezone('utc'::text, now()) - INTERVAL '14 days' + INTERVAL '20 minutes')
ON CONFLICT (id) DO NOTHING;

-- 9. PRESCRIPTIONS
INSERT INTO public.prescriptions (id, consultation_id, patient_id, doctor_id, notes, is_dispensed)
VALUES
  ('pr000000-0000-0000-0000-000000000001', 'cs000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000007', 'u0000000-0000-0000-0000-000000000001', 'Take medication with plenty of water. Return if symptoms worsen.', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions)
VALUES
  ('pr000000-0000-0000-0000-000000000001', 'Levocetirizine', '5mg', 'Once at bedtime', '14 days', 'Do not drive if drowsy'),
  ('pr000000-0000-0000-0000-000000000001', 'Fluticasone Propionate Nasal Spray', '50mcg/spray', '1 spray in each nostril daily', '30 days', 'Blow nose gently before use')
ON CONFLICT DO NOTHING;

-- 10. LABORATORY REPORTS
INSERT INTO public.laboratory_reports (id, report_number, patient_id, doctor_id, clinic_id, test_name, test_category, status, report_date, result_summary, is_authorized)
VALUES
  ('lb000000-0000-0000-0000-000000000001', 'LAB-2026-0881', 'u0000000-0000-0000-0000-000000000007', 'u0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Full Blood Count (FBC)', 'Hematology', 'completed', CURRENT_DATE - INTERVAL '14 days', 'WBC: 6.8 x10^9/L (Normal), Hb: 14.2 g/dL (Normal), Platelets: 245 x10^9/L (Normal)', true),
  ('lb000000-0000-0000-0000-000000000002', 'LAB-2026-0882', 'u0000000-0000-0000-0000-000000000007', 'u0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Total Serum IgE', 'Biochemistry', 'completed', CURRENT_DATE - INTERVAL '14 days', 'Serum IgE: 160 IU/mL (Mildly elevated, consistent with atopic profile)', true)
ON CONFLICT (id) DO NOTHING;

-- 11. DEVICES
INSERT INTO public.devices (name, device_type, clinic_id, ip_or_identifier, status, last_ping)
VALUES
  ('Reception Barcode Scanner 1', 'scanner', 'c0000000-0000-0000-0000-000000000001', 'USB-HID-SCANNER-01', 'online', timezone('utc'::text, now())),
  ('Token Thermal Receipt Printer', 'printer', 'c0000000-0000-0000-0000-000000000001', 'USB-POS-PRINTER-01', 'online', timezone('utc'::text, now())),
  ('OPD Waiting Hall Main Display', 'display', 'c0000000-0000-0000-0000-000000000001', 'DISP-OPD-HALL-A', 'online', timezone('utc'::text, now())),
  ('Pediatrics Digital Queue Screen', 'display', 'c0000000-0000-0000-0000-000000000002', 'DISP-PED-HALL-B', 'online', timezone('utc'::text, now()))
ON CONFLICT DO NOTHING;

-- 12. NOTIFICATIONS
INSERT INTO public.notifications (recipient_id, type, title, message, related_entity_id, related_entity_type)
VALUES
  ('u0000000-0000-0000-0000-000000000007', 'token_generated', 'Token Issued: OPD015', 'Your token OPD015 is registered for General Outpatient (OPD). Current queue status: Waiting.', 'q0000000-0000-0000-0000-000000000001', 'queue_entry'),
  ('u0000000-0000-0000-0000-000000000001', 'token_generated', 'New Patient Check-in', 'Patient Kasun Bandara (Token OPD015) has checked into General Outpatient.', 'q0000000-0000-0000-0000-000000000001', 'queue_entry')
ON CONFLICT DO NOTHING;

-- 13. SYSTEM HEALTH LOGS
INSERT INTO public.system_health_logs (component, status, response_time_ms, error_message, details)
VALUES
  ('database', 'healthy', 12, NULL, '{"connections_active": 4, "max_pool": 20}'::jsonb),
  ('realtime', 'healthy', 25, NULL, '{"connected_clients": 6, "channels": 4}'::jsonb),
  ('display_sync', 'healthy', 40, NULL, '{"display_id": "DISP-OPD-HALL-A", "last_heartbeat_seconds_ago": 5}'::jsonb)
ON CONFLICT DO NOTHING;
