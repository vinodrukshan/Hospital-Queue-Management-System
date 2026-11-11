import { describe, it, expect } from 'vitest';
import { INITIAL_PROFILES } from '../services/mockDataStore';
import { patientService } from '../services/patientService';

describe('Role & Permission Security Boundaries', () => {
  it('identifies valid accounts for all six hospital roles', () => {
    const roles = ['patient', 'doctor', 'receptionist', 'hospital_admin', 'clinic_head', 'technical_maintainer'];
    for (const r of roles) {
      const match = INITIAL_PROFILES.find(p => p.role === r);
      expect(match).toBeDefined();
      expect(match?.role).toBe(r);
    }
  });

  it('restricts patient access to their own authorized medical records only', async () => {
    const patientA = 'u0000000-0000-0000-0000-000000000007';
    const patientB = 'u0000000-0000-0000-0000-000000000008';

    const recordsA = await patientService.getPatientConsultations(patientA);
    expect(recordsA.every(c => c.patient_id === patientA)).toBe(true);

    const recordsB = await patientService.getPatientConsultations(patientB);
    expect(recordsB.every(c => c.patient_id === patientB)).toBe(true);
  });

  it('restricts lab report visibility to authorized status only', async () => {
    const patientA = 'u0000000-0000-0000-0000-000000000007';
    const reports = await patientService.getPatientLabReports(patientA);
    expect(reports.every(r => r.is_authorized === true)).toBe(true);
  });
});
