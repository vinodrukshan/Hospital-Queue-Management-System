-- Project G05: Hospital Queue Management System
-- Server-Side Queue Engine & Transactional Functions

-- 1. FUNCTION: generate_queue_token
CREATE OR REPLACE FUNCTION public.generate_queue_token(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_visit_id UUID,
  p_priority priority_level DEFAULT 'normal',
  p_doctor_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clinic RECORD;
  v_existing_token RECORD;
  v_next_seq INTEGER;
  v_token_number TEXT;
  v_new_entry RECORD;
  v_patient_name TEXT;
BEGIN
  -- 1. Check if an active token already exists for this visit (Prevent duplicate token generation)
  SELECT id, token_number, status INTO v_existing_token
  FROM public.queue_entries
  WHERE visit_id = p_visit_id AND status NOT IN ('cancelled', 'completed', 'no_show')
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'A token (%) is already active for this visit.', v_existing_token.token_number;
  END IF;

  -- 2. Lock the clinic row to guarantee atomic, monotonic token sequence
  SELECT id, code, current_token_sequence, name INTO v_clinic
  FROM public.clinics
  WHERE id = p_clinic_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clinic not found';
  END IF;

  v_next_seq := v_clinic.current_token_sequence + 1;
  
  -- Update clinic sequence
  UPDATE public.clinics
  SET current_token_sequence = v_next_seq
  WHERE id = p_clinic_id;

  -- Format token number: e.g. "A001" or "OPD-001"
  v_token_number := v_clinic.code || LPAD(v_next_seq::TEXT, 3, '0');

  -- 3. Insert Queue Entry
  INSERT INTO public.queue_entries (
    token_number,
    clinic_id,
    doctor_id,
    visit_id,
    patient_id,
    sequence_number,
    priority,
    status,
    checked_in_at
  ) VALUES (
    v_token_number,
    p_clinic_id,
    p_doctor_id,
    p_visit_id,
    p_patient_id,
    v_next_seq,
    p_priority,
    'waiting',
    timezone('utc'::text, now())
  )
  RETURNING * INTO v_new_entry;

  -- 4. Record Queue Event
  INSERT INTO public.queue_events (
    queue_entry_id,
    clinic_id,
    event_type,
    previous_status,
    new_status,
    triggered_by,
    details
  ) VALUES (
    v_new_entry.id,
    p_clinic_id,
    'generated',
    NULL,
    'waiting',
    p_created_by,
    jsonb_build_object(
      'token_number', v_token_number,
      'priority', p_priority,
      'clinic_name', v_clinic.name
    )
  );

  -- 5. Create In-App Notification for Patient
  INSERT INTO public.notifications (
    recipient_id,
    type,
    title,
    message,
    related_entity_id,
    related_entity_type
  ) VALUES (
    p_patient_id,
    'token_generated',
    'Official Token Issued',
    'Your token ' || v_token_number || ' for ' || v_clinic.name || ' has been issued. Priority: ' || p_priority || '. Please watch the queue display.',
    v_new_entry.id,
    'queue_entry'
  );

  -- 6. Also create audit log
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    p_created_by,
    'TOKEN_GENERATED',
    'queue_entries',
    v_new_entry.id::TEXT,
    jsonb_build_object('token_number', v_token_number, 'clinic_id', p_clinic_id)
  );

  RETURN to_jsonb(v_new_entry);
END;
$$;


-- 2. FUNCTION: call_next_patient
CREATE OR REPLACE FUNCTION public.call_next_patient(
  p_clinic_id UUID,
  p_doctor_id UUID,
  p_counter_or_room TEXT,
  p_called_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_entry RECORD;
  v_clinic_name TEXT;
BEGIN
  -- Select next eligible patient with lock skip locked to prevent race conditions
  -- Priority ordering: urgent > elderly / child > normal, then sequence number
  SELECT q.* INTO v_target_entry
  FROM public.queue_entries q
  WHERE q.clinic_id = p_clinic_id
    AND q.status = 'waiting'
    AND (q.doctor_id IS NULL OR q.doctor_id = p_doctor_id)
  ORDER BY 
    CASE q.priority
      WHEN 'urgent' THEN 1
      WHEN 'elderly' THEN 2
      WHEN 'child' THEN 3
      ELSE 4
    END ASC,
    q.sequence_number ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No eligible patients waiting in this queue.');
  END IF;

  -- Update entry to called
  UPDATE public.queue_entries
  SET 
    status = 'called',
    called_at = timezone('utc'::text, now()),
    counter_or_room = p_counter_or_room,
    doctor_id = p_doctor_id,
    updated_at = timezone('utc'::text, now())
  WHERE id = v_target_entry.id
  RETURNING * INTO v_target_entry;

  -- Queue Event
  INSERT INTO public.queue_events (
    queue_entry_id,
    clinic_id,
    event_type,
    previous_status,
    new_status,
    triggered_by,
    details
  ) VALUES (
    v_target_entry.id,
    p_clinic_id,
    'called',
    'waiting',
    'called',
    p_called_by,
    jsonb_build_object('counter_or_room', p_counter_or_room, 'doctor_id', p_doctor_id)
  );

  -- Patient Notification
  SELECT name INTO v_clinic_name FROM public.clinics WHERE id = p_clinic_id;
  INSERT INTO public.notifications (
    recipient_id,
    type,
    title,
    message,
    related_entity_id,
    related_entity_type
  ) VALUES (
    v_target_entry.patient_id,
    'queue_call',
    'Token Called: ' || v_target_entry.token_number,
    'Token ' || v_target_entry.token_number || ', please proceed to ' || COALESCE(p_counter_or_room, 'the consultation room') || ' for ' || COALESCE(v_clinic_name, 'your clinic') || '.',
    v_target_entry.id,
    'queue_entry'
  );

  RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_target_entry));
END;
$$;


-- 3. FUNCTION: recall_patient
CREATE OR REPLACE FUNCTION public.recall_patient(
  p_queue_entry_id UUID,
  p_recalled_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
BEGIN
  SELECT * INTO v_entry
  FROM public.queue_entries
  WHERE id = p_queue_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Queue entry not found.');
  END IF;

  IF v_entry.status NOT IN ('called', 'recalled') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only called or recalled patients can be recalled.');
  END IF;

  UPDATE public.queue_entries
  SET 
    status = 'recalled',
    recalled_at = timezone('utc'::text, now()),
    recall_count = recall_count + 1,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_queue_entry_id
  RETURNING * INTO v_entry;

  -- Event
  INSERT INTO public.queue_events (
    queue_entry_id,
    clinic_id,
    event_type,
    previous_status,
    new_status,
    triggered_by,
    details
  ) VALUES (
    v_entry.id,
    v_entry.clinic_id,
    'recalled',
    'called',
    'recalled',
    p_recalled_by,
    jsonb_build_object('recall_count', v_entry.recall_count)
  );

  -- Patient Notification
  INSERT INTO public.notifications (
    recipient_id,
    type,
    title,
    message,
    related_entity_id,
    related_entity_type
  ) VALUES (
    v_entry.patient_id,
    'recall',
    'RECALL: Token ' || v_entry.token_number,
    'Your token ' || v_entry.token_number || ' is being recalled. Please report immediately to ' || COALESCE(v_entry.counter_or_room, 'the consultation room') || '.',
    v_entry.id,
    'queue_entry'
  );

  RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_entry));
END;
$$;


-- 4. FUNCTION: start_consultation
CREATE OR REPLACE FUNCTION public.start_consultation(
  p_queue_entry_id UUID,
  p_doctor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
BEGIN
  SELECT * INTO v_entry
  FROM public.queue_entries
  WHERE id = p_queue_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Queue entry not found.');
  END IF;

  IF v_entry.status NOT IN ('called', 'recalled') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot start consultation for an entry not in called/recalled status.');
  END IF;

  UPDATE public.queue_entries
  SET 
    status = 'consulting',
    consultation_started_at = timezone('utc'::text, now()),
    doctor_id = p_doctor_id,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_queue_entry_id
  RETURNING * INTO v_entry;

  INSERT INTO public.queue_events (
    queue_entry_id,
    clinic_id,
    event_type,
    previous_status,
    new_status,
    triggered_by,
    details
  ) VALUES (
    v_entry.id,
    v_entry.clinic_id,
    'consulting_started',
    'called',
    'consulting',
    p_doctor_id,
    jsonb_build_object('doctor_id', p_doctor_id)
  );

  RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_entry));
END;
$$;


-- 5. FUNCTION: complete_consultation
CREATE OR REPLACE FUNCTION public.complete_consultation(
  p_queue_entry_id UUID,
  p_doctor_id UUID,
  p_diagnosis TEXT,
  p_clinical_notes TEXT DEFAULT NULL,
  p_chief_complaint TEXT DEFAULT NULL,
  p_symptoms TEXT DEFAULT NULL,
  p_follow_up_date DATE DEFAULT NULL,
  p_vitals JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
  v_consultation RECORD;
BEGIN
  SELECT * INTO v_entry
  FROM public.queue_entries
  WHERE id = p_queue_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Queue entry not found.');
  END IF;

  -- Update Queue Entry to completed
  UPDATE public.queue_entries
  SET 
    status = 'completed',
    completed_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_queue_entry_id
  RETURNING * INTO v_entry;

  -- Create Consultation record
  INSERT INTO public.consultations (
    queue_entry_id,
    visit_id,
    patient_id,
    doctor_id,
    clinic_id,
    chief_complaint,
    symptoms,
    clinical_notes,
    diagnosis,
    vitals,
    follow_up_date,
    consultation_start,
    consultation_end
  ) VALUES (
    v_entry.id,
    v_entry.visit_id,
    v_entry.patient_id,
    p_doctor_id,
    v_entry.clinic_id,
    p_chief_complaint,
    p_symptoms,
    p_clinical_notes,
    p_diagnosis,
    p_vitals,
    p_follow_up_date,
    COALESCE(v_entry.consultation_started_at, timezone('utc'::text, now())),
    timezone('utc'::text, now())
  )
  RETURNING * INTO v_consultation;

  -- Update visit status to completed
  UPDATE public.visits
  SET status = 'completed'
  WHERE id = v_entry.visit_id;

  -- Record Queue Event
  INSERT INTO public.queue_events (
    queue_entry_id,
    clinic_id,
    event_type,
    previous_status,
    new_status,
    triggered_by,
    details
  ) VALUES (
    v_entry.id,
    v_entry.clinic_id,
    'completed',
    'consulting',
    'completed',
    p_doctor_id,
    jsonb_build_object('consultation_id', v_consultation.id, 'diagnosis', p_diagnosis)
  );

  -- Patient Notification
  INSERT INTO public.notifications (
    recipient_id,
    type,
    title,
    message,
    related_entity_id,
    related_entity_type
  ) VALUES (
    v_entry.patient_id,
    'consultation_complete',
    'Consultation Completed',
    'Your consultation for Token ' || v_entry.token_number || ' is complete. Diagnoses and records are now available.',
    v_consultation.id,
    'consultation'
  );

  RETURN jsonb_build_object(
    'success', true, 
    'queue_entry', to_jsonb(v_entry), 
    'consultation', to_jsonb(v_consultation)
  );
END;
$$;


-- 6. FUNCTION: cancel_queue_token
CREATE OR REPLACE FUNCTION public.cancel_queue_token(
  p_queue_entry_id UUID,
  p_reason TEXT,
  p_cancelled_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A valid cancellation reason is required.';
  END IF;

  SELECT * INTO v_entry
  FROM public.queue_entries
  WHERE id = p_queue_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Queue entry not found.');
  END IF;

  UPDATE public.queue_entries
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_by = p_cancelled_by,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_queue_entry_id
  RETURNING * INTO v_entry;

  INSERT INTO public.queue_events (
    queue_entry_id,
    clinic_id,
    event_type,
    previous_status,
    new_status,
    triggered_by,
    details
  ) VALUES (
    v_entry.id,
    v_entry.clinic_id,
    'cancelled',
    v_entry.status,
    'cancelled',
    p_cancelled_by,
    jsonb_build_object('reason', p_reason)
  );

  INSERT INTO public.notifications (
    recipient_id,
    type,
    title,
    message,
    related_entity_id,
    related_entity_type
  ) VALUES (
    v_entry.patient_id,
    'system_alert',
    'Token Cancelled: ' || v_entry.token_number,
    'Your token ' || v_entry.token_number || ' was cancelled. Reason: ' || p_reason,
    v_entry.id,
    'queue_entry'
  );

  RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_entry));
END;
$$;
