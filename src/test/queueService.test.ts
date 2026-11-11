import { describe, it, expect, beforeEach } from 'vitest';
import { queueService } from '../services/queueService';
import { INITIAL_QUEUE_ENTRIES } from '../services/mockDataStore';

describe('Hospital Queue Management Engine', () => {
  const clinicId = 'c0000000-0000-0000-0000-000000000001';
  const doctorId = 'u0000000-0000-0000-0000-000000000001';
  const patientId = 'u0000000-0000-0000-0000-000000000007';

  it('generates sequential official tokens with clinic code', async () => {
    const visitId = 'v-test-' + Date.now();
    const result = await queueService.generateToken({
      clinicId,
      patientId,
      visitId,
      priority: 'normal',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.token_number).toMatch(/^OPD\d{3}$/);
    expect(result.data?.status).toBe('waiting');
  });

  it('prevents duplicate active tokens for the same visit', async () => {
    const visitId = 'v-duplicate-test';
    const first = await queueService.generateToken({
      clinicId,
      patientId,
      visitId,
      priority: 'normal',
    });
    expect(first.success).toBe(true);

    // Second attempt with same visit ID
    const second = await queueService.generateToken({
      clinicId,
      patientId,
      visitId,
      priority: 'normal',
    });
    expect(second.success).toBe(false);
    expect(second.message).toContain('already active');
  });

  it('prioritizes urgent patients when calling next', async () => {
    // Generate urgent token
    const urgentVisitId = 'v-urgent-' + Date.now();
    const urgentToken = await queueService.generateToken({
      clinicId,
      patientId,
      visitId: urgentVisitId,
      priority: 'urgent',
    });
    expect(urgentToken.success).toBe(true);

    // Call Next Patient
    const callRes = await queueService.callNextPatient({
      clinicId,
      doctorId,
      counterOrRoom: 'Room 101',
      calledBy: doctorId,
    });

    expect(callRes.success).toBe(true);
    expect(callRes.data?.priority).toBe('urgent');
    expect(callRes.data?.status).toBe('called');
    expect(callRes.data?.called_at).toBeDefined();
  });

  it('recalls an active called token without generating a new token', async () => {
    // Find or call an entry
    const entries = await queueService.getQueueEntries(clinicId);
    let calledEntry = entries.find(e => e.status === 'called');

    if (!calledEntry) {
      const call = await queueService.callNextPatient({
        clinicId,
        doctorId,
        counterOrRoom: 'Room 101',
        calledBy: doctorId,
      });
      calledEntry = call.data;
    }

    if (calledEntry) {
      const initialTokenNumber = calledEntry.token_number;
      const initialRecallCount = calledEntry.recall_count || 0;

      const recallRes = await queueService.recallPatient(calledEntry.id, doctorId);
      expect(recallRes.success).toBe(true);
      expect(recallRes.data?.token_number).toBe(initialTokenNumber); // Same token preserved!
      expect(recallRes.data?.status).toBe('recalled');
      expect(recallRes.data?.recall_count).toBe(initialRecallCount + 1);
    }
  });

  it('completes consultation and saves clinical records', async () => {
    const entries = await queueService.getQueueEntries(clinicId);
    let calledEntry = entries.find(e => e.status === 'called' || e.status === 'recalled');

    if (calledEntry) {
      const completeRes = await queueService.completeConsultation({
        queueEntryId: calledEntry.id,
        doctorId,
        diagnosis: 'Acute Pharyngitis',
        notes: 'Advised rest and fluid intake.',
        vitals: { bp: '120/80', pulse: 72, temp: '37.1', spo2: 99 },
      });

      expect(completeRes.success).toBe(true);

      const updatedEntries = await queueService.getQueueEntries(clinicId);
      const target = updatedEntries.find(e => e.id === calledEntry?.id);
      expect(target?.status).toBe('completed');
    }
  });

  it('requires an authorized cancellation reason to cancel a token', async () => {
    const visitId = 'v-cancel-' + Date.now();
    const token = await queueService.generateToken({
      clinicId,
      patientId,
      visitId,
      priority: 'normal',
    });

    if (token.data) {
      // Empty reason should fail
      const failed = await queueService.cancelQueueToken(token.data.id, '', 'reception');
      expect(failed.success).toBe(false);

      // Valid reason should succeed
      const success = await queueService.cancelQueueToken(token.data.id, 'Patient departed clinic', 'reception');
      expect(success.success).toBe(true);
    }
  });
});
