import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { QueueEntry, PriorityLevel, QueueStatus } from '../types/database';
import { 
  INITIAL_QUEUE_ENTRIES, 
  INITIAL_CLINICS, 
  INITIAL_PROFILES, 
  INITIAL_VISITS,
  INITIAL_CONSULTATIONS,
  INITIAL_NOTIFICATIONS
} from './mockDataStore';

// Cross-tab shared storage key
const LOCAL_QUEUE_STORAGE_KEY = 'hospital_local_queue_v1';

// In-memory reactive state for local store / offline fallback
// Try to restore from localStorage (shared between tabs) on first load
let localQueue: QueueEntry[] = (() => {
  try {
    const stored = localStorage.getItem(LOCAL_QUEUE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as QueueEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_e) { /* ignore */ }
  return [...INITIAL_QUEUE_ENTRIES];
})();

let localListeners: Array<() => void> = [];

export const subscribeLocalQueue = (callback: () => void) => {
  localListeners.push(callback);
  return () => {
    localListeners = localListeners.filter(l => l !== callback);
  };
};

const notifyQueueChange = () => {
  // Persist to localStorage so other browser tabs pick up the change instantly
  try {
    localStorage.setItem(LOCAL_QUEUE_STORAGE_KEY, JSON.stringify(localQueue));
  } catch (_e) { /* storage quota – ignore */ }
  localListeners.forEach(fn => fn());
};

export const queueService = {
  async getQueueEntries(clinicId?: string): Promise<QueueEntry[]> {
    if (isSupabaseConfigured()) {
      let query = supabase
        .from('queue_entries')
        .select(`
          *,
          patient:patient_id(id, full_name, phone, national_id),
          clinic:clinic_id(id, name, code),
          doctor:doctor_id(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as unknown as QueueEntry[];
      }
    }

    // Local / interactive fallback
    let res = [...localQueue];
    if (clinicId) {
      res = res.filter(q => q.clinic_id === clinicId);
    }
    return res.map(entry => {
      const patient = INITIAL_PROFILES.find(p => p.id === entry.patient_id);
      const clinic = INITIAL_CLINICS.find(c => c.id === entry.clinic_id);
      const doctor = entry.doctor_id ? INITIAL_PROFILES.find(p => p.id === entry.doctor_id) : undefined;
      return { ...entry, patient, clinic, doctor };
    });
  },

  async getPatientQueueToken(patientId: string): Promise<QueueEntry | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('queue_entries')
        .select(`
          *,
          clinic:clinic_id(id, name, code, rooms),
          doctor:doctor_id(id, full_name)
        `)
        .eq('patient_id', patientId)
        .in('status', ['waiting', 'called', 'recalled', 'consulting'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data as unknown as QueueEntry;
      }
    }

    const found = localQueue.find(
      q => q.patient_id === patientId && ['waiting', 'called', 'recalled', 'consulting'].includes(q.status)
    );
    if (!found) return null;
    const clinic = INITIAL_CLINICS.find(c => c.id === found.clinic_id);
    const doctor = found.doctor_id ? INITIAL_PROFILES.find(p => p.id === found.doctor_id) : undefined;
    return { ...found, clinic, doctor };
  },

  async generateToken(params: {
    clinicId: string;
    patientId: string;
    visitId: string;
    priority?: PriorityLevel;
    doctorId?: string;
    createdBy?: string;
  }): Promise<{ success: boolean; data?: QueueEntry; message?: string }> {
    const priority = params.priority || 'normal';

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.rpc('generate_queue_token', {
        p_clinic_id: params.clinicId,
        p_patient_id: params.patientId,
        p_visit_id: params.visitId,
        p_priority: priority,
        p_doctor_id: params.doctorId || null,
        p_created_by: params.createdBy || null,
      });

      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, data: data as QueueEntry };
    }

    // Check duplicate active token
    const existing = localQueue.find(
      q => q.visit_id === params.visitId && !['cancelled', 'completed', 'no_show'].includes(q.status)
    );
    if (existing) {
      return { success: false, message: `Token ${existing.token_number} is already active for this visit.` };
    }

    const clinic = INITIAL_CLINICS.find(c => c.id === params.clinicId);
    if (!clinic) return { success: false, message: 'Clinic not found' };

    clinic.current_token_sequence += 1;
    const seq = clinic.current_token_sequence;
    const tokenNumber = `${clinic.code}${String(seq).padStart(3, '0')}`;

    const newEntry: QueueEntry = {
      id: 'q-' + Math.random().toString(36).substring(2, 9),
      token_number: tokenNumber,
      clinic_id: params.clinicId,
      doctor_id: params.doctorId,
      visit_id: params.visitId,
      patient_id: params.patientId,
      sequence_number: seq,
      priority,
      status: 'waiting',
      checked_in_at: new Date().toISOString(),
      recall_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localQueue.unshift(newEntry);

    // Add in-app notification
    INITIAL_NOTIFICATIONS.unshift({
      id: 'n-' + Math.random().toString(36).substring(2, 9),
      recipient_id: params.patientId,
      type: 'token_generated',
      title: 'Official Token Issued',
      message: `Your token ${tokenNumber} for ${clinic.name} has been issued. Priority: ${priority}.`,
      related_entity_id: newEntry.id,
      related_entity_type: 'queue_entry',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    notifyQueueChange();
    return { success: true, data: newEntry };
  },

  async callNextPatient(params: {
    clinicId: string;
    doctorId: string;
    counterOrRoom: string;
    calledBy: string;
  }): Promise<{ success: boolean; data?: QueueEntry; message?: string }> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.rpc('call_next_patient', {
        p_clinic_id: params.clinicId,
        p_doctor_id: params.doctorId,
        p_counter_or_room: params.counterOrRoom,
        p_called_by: params.calledBy,
      });

      if (error) {
        return { success: false, message: error.message };
      }
      return data;
    }

    // Local queue selection: priority urgent > elderly > child > normal, then sequence
    const priorityWeights: Record<string, number> = { urgent: 1, elderly: 2, child: 3, normal: 4 };
    const eligible = localQueue
      .filter(q => q.clinic_id === params.clinicId && q.status === 'waiting')
      .sort((a, b) => {
        const weightA = priorityWeights[a.priority] || 4;
        const weightB = priorityWeights[b.priority] || 4;
        if (weightA !== weightB) return weightA - weightB;
        return a.sequence_number - b.sequence_number;
      });

    if (eligible.length === 0) {
      return { success: false, message: 'No eligible patients waiting in this queue.' };
    }

    const target = eligible[0];
    target.status = 'called';
    target.called_at = new Date().toISOString();
    target.counter_or_room = params.counterOrRoom;
    target.doctor_id = params.doctorId;
    target.updated_at = new Date().toISOString();

    const clinic = INITIAL_CLINICS.find(c => c.id === target.clinic_id);

    // Patient notification
    INITIAL_NOTIFICATIONS.unshift({
      id: 'n-' + Math.random().toString(36).substring(2, 9),
      recipient_id: target.patient_id,
      type: 'queue_call',
      title: `Token Called: ${target.token_number}`,
      message: `Token ${target.token_number}, please proceed to ${params.counterOrRoom || 'the consultation room'} for ${clinic?.name || 'Clinic'}.`,
      related_entity_id: target.id,
      related_entity_type: 'queue_entry',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    notifyQueueChange();
    return { success: true, data: target };
  },

  async recallPatient(queueEntryId: string, recalledBy: string): Promise<{ success: boolean; data?: QueueEntry; message?: string }> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.rpc('recall_patient', {
        p_queue_entry_id: queueEntryId,
        p_recalled_by: recalledBy,
      });
      if (error) return { success: false, message: error.message };
      return data;
    }

    const entry = localQueue.find(q => q.id === queueEntryId);
    if (!entry) return { success: false, message: 'Queue entry not found' };
    if (!['called', 'recalled'].includes(entry.status)) {
      return { success: false, message: 'Only called or recalled patients can be recalled.' };
    }

    entry.status = 'recalled';
    entry.recalled_at = new Date().toISOString();
    entry.recall_count = (entry.recall_count || 0) + 1;
    entry.updated_at = new Date().toISOString();

    INITIAL_NOTIFICATIONS.unshift({
      id: 'n-' + Math.random().toString(36).substring(2, 9),
      recipient_id: entry.patient_id,
      type: 'recall',
      title: `RECALL: Token ${entry.token_number}`,
      message: `Your token ${entry.token_number} is being recalled. Please report immediately to ${entry.counter_or_room || 'the consultation room'}.`,
      related_entity_id: entry.id,
      related_entity_type: 'queue_entry',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    notifyQueueChange();
    return { success: true, data: entry };
  },

  async startConsultation(queueEntryId: string, doctorId: string): Promise<{ success: boolean; data?: QueueEntry; message?: string }> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.rpc('start_consultation', {
        p_queue_entry_id: queueEntryId,
        p_doctor_id: doctorId,
      });
      if (error) return { success: false, message: error.message };
      return data;
    }

    const entry = localQueue.find(q => q.id === queueEntryId);
    if (!entry) return { success: false, message: 'Queue entry not found' };

    entry.status = 'consulting';
    entry.consultation_started_at = new Date().toISOString();
    entry.doctor_id = doctorId;
    entry.updated_at = new Date().toISOString();

    notifyQueueChange();
    return { success: true, data: entry };
  },

  async completeConsultation(params: {
    queueEntryId: string;
    doctorId: string;
    diagnosis: string;
    notes?: string;
    chiefComplaint?: string;
    symptoms?: string;
    vitals?: any;
    followUpDate?: string;
  }): Promise<{ success: boolean; message?: string }> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.rpc('complete_consultation', {
        p_queue_entry_id: params.queueEntryId,
        p_doctor_id: params.doctorId,
        p_diagnosis: params.diagnosis,
        p_clinical_notes: params.notes || null,
        p_chief_complaint: params.chiefComplaint || null,
        p_symptoms: params.symptoms || null,
        p_follow_up_date: params.followUpDate || null,
        p_vitals: params.vitals || {},
      });
      if (error) return { success: false, message: error.message };
      return data;
    }

    const entry = localQueue.find(q => q.id === params.queueEntryId);
    if (!entry) return { success: false, message: 'Queue entry not found' };

    entry.status = 'completed';
    entry.completed_at = new Date().toISOString();
    entry.updated_at = new Date().toISOString();

    // Create consultation entry
    INITIAL_CONSULTATIONS.unshift({
      id: 'cs-' + Math.random().toString(36).substring(2, 9),
      queue_entry_id: entry.id,
      visit_id: entry.visit_id,
      patient_id: entry.patient_id,
      doctor_id: params.doctorId,
      clinic_id: entry.clinic_id,
      chief_complaint: params.chiefComplaint,
      symptoms: params.symptoms,
      clinical_notes: params.notes,
      diagnosis: params.diagnosis,
      vitals: params.vitals,
      follow_up_date: params.followUpDate,
      consultation_start: entry.consultation_started_at || new Date(Date.now() - 15 * 60000).toISOString(),
      consultation_end: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    // Notify patient
    INITIAL_NOTIFICATIONS.unshift({
      id: 'n-' + Math.random().toString(36).substring(2, 9),
      recipient_id: entry.patient_id,
      type: 'consultation_complete',
      title: 'Consultation Completed',
      message: `Your consultation for Token ${entry.token_number} is complete. Diagnoses and records are now available.`,
      related_entity_id: entry.id,
      related_entity_type: 'consultation',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    notifyQueueChange();
    return { success: true };
  },

  async cancelQueueToken(queueEntryId: string, reason: string, cancelledBy: string): Promise<{ success: boolean; message?: string }> {
    if (!reason || !reason.trim()) {
      return { success: false, message: 'A valid cancellation reason is required.' };
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.rpc('cancel_queue_token', {
        p_queue_entry_id: queueEntryId,
        p_reason: reason,
        p_cancelled_by: cancelledBy,
      });
      if (error) return { success: false, message: error.message };
      return data;
    }

    const entry = localQueue.find(q => q.id === queueEntryId);
    if (!entry) return { success: false, message: 'Queue entry not found' };

    entry.status = 'cancelled';
    entry.cancellation_reason = reason;
    entry.cancelled_by = cancelledBy;
    entry.updated_at = new Date().toISOString();

    notifyQueueChange();
    return { success: true };
  },
};
