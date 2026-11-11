import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { queueService, subscribeLocalQueue } from '../../services/queueService';
import { clinicService } from '../../services/clinicService';
import { patientService } from '../../services/patientService';
import { QueueEntry, Clinic, Consultation, LaboratoryReport, Profile, Patient } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { formatDateTime, formatDate, formatTime } from '../../lib/utils';
import { 
  Stethoscope, 
  Users, 
  PhoneCall, 
  RotateCcw, 
  Play, 
  CheckCircle, 
  FileText, 
  HeartPulse, 
  AlertCircle, 
  User, 
  Clock, 
  Plus, 
  Trash2,
  Calendar,
  Sparkles
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [activePatientEntry, setActivePatientEntry] = useState<QueueEntry | null>(null);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<{
    consultations: Consultation[];
    reports: LaboratoryReport[];
    details?: Patient;
    profile?: Profile;
  } | null>(null);

  const [counterRoom, setCounterRoom] = useState('Room 101');
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Complete Consultation Modal State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [vitals, setVitals] = useState({ bp: '120/80', pulse: 74, temp: '36.8', spo2: 99 });
  const [followUpDays, setFollowUpDays] = useState('14');

  const refreshData = async () => {
    if (!user) return;
    setIsLoading(true);

    const clinicId = user.clinic_id || 'c0000000-0000-0000-0000-000000000001';
    const [clinicData, queueData] = await Promise.all([
      clinicService.getClinicById(clinicId),
      queueService.getQueueEntries(clinicId),
    ]);

    if (clinicData) {
      setClinic(clinicData);
      if (clinicData.rooms && clinicData.rooms.length > 0) {
        setCounterRoom(clinicData.rooms[0]);
      }
    }
    setQueue(queueData);

    // Identify active patient (currently consulting, called, or recalled for this doctor/clinic)
    const active = queueData.find(
      q => ['consulting', 'called', 'recalled'].includes(q.status) && (q.doctor_id === user.id || !q.doctor_id)
    );
    setActivePatientEntry(active || null);

    if (active) {
      loadPatientDetails(active.patient_id);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
    const unsub = subscribeLocalQueue(() => {
      refreshData();
    });
    return unsub;
  }, [user]);

  const loadPatientDetails = async (patientId: string) => {
    const [pProf, consults, reports] = await Promise.all([
      patientService.getPatientProfile(patientId),
      patientService.getPatientConsultations(patientId),
      patientService.getPatientLabReports(patientId),
    ]);

    setSelectedPatientHistory({
      profile: pProf?.profile,
      details: pProf?.details,
      consultations: consults,
      reports: reports,
    });
  };

  // 1. CALL NEXT PATIENT
  const handleCallNext = async () => {
    if (!user || !clinic) return;
    setActionError(null);
    setActionSuccess(null);

    const res = await queueService.callNextPatient({
      clinicId: clinic.id,
      doctorId: user.id,
      counterOrRoom: counterRoom,
      calledBy: user.id,
    });

    if (!res.success) {
      setActionError(res.message || 'No waiting patient to call.');
    } else {
      setActionSuccess(`Token ${res.data?.token_number} called to ${counterRoom}!`);
      refreshData();
    }
  };

  // 2. RECALL PATIENT
  const handleRecall = async () => {
    if (!activePatientEntry || !user) return;
    setActionError(null);
    setActionSuccess(null);

    const res = await queueService.recallPatient(activePatientEntry.id, user.id);
    if (!res.success) {
      setActionError(res.message || 'Failed to recall patient.');
    } else {
      setActionSuccess(`Recall announcement triggered for Token ${activePatientEntry.token_number}!`);
      refreshData();
    }
  };

  // 3. START CONSULTATION
  const handleStartConsultation = async () => {
    if (!activePatientEntry || !user) return;
    setActionError(null);
    setActionSuccess(null);

    const res = await queueService.startConsultation(activePatientEntry.id, user.id);
    if (!res.success) {
      setActionError(res.message || 'Failed to start consultation.');
    } else {
      setActionSuccess(`Consultation in progress for Token ${activePatientEntry.token_number}`);
      refreshData();
    }
  };

  // 4. COMPLETE CONSULTATION
  const handleCompleteConsultation = async () => {
    if (!activePatientEntry || !user) return;
    if (!diagnosis.trim()) {
      setActionError('Diagnosis is required to complete consultation documentation.');
      return;
    }

    const followUpDate = new Date(Date.now() + parseInt(followUpDays, 10) * 86400000).toISOString().split('T')[0];

    const res = await queueService.completeConsultation({
      queueEntryId: activePatientEntry.id,
      doctorId: user.id,
      diagnosis,
      notes: clinicalNotes,
      chiefComplaint,
      symptoms,
      vitals,
      followUpDate,
    });

    if (!res.success) {
      setActionError(res.message || 'Error completing consultation.');
    } else {
      setActionSuccess(`Consultation for Token ${activePatientEntry.token_number} successfully completed and saved.`);
      setIsCompleteModalOpen(false);
      setDiagnosis('');
      setClinicalNotes('');
      setChiefComplaint('');
      setSymptoms('');
      refreshData();
    }
  };

  const waitingPatients = queue.filter(q => q.status === 'waiting');
  const completedToday = queue.filter(q => q.status === 'completed');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner: Doctor Profile & Assigned Room */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xl shadow-xs">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-sky-50 text-sky-700 font-bold px-2 py-0.5 rounded-full border border-sky-200">
                Staff ID: {user?.staff_id || 'DOC-0101'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">{clinic?.name || 'General OPD Clinic'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{user?.full_name}</h1>
            <p className="text-xs text-slate-500">{user?.specialty || 'Senior Consultant Physician'}</p>
          </div>
        </div>

        {/* Counter / Consultation Room Selector */}
        <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-600">Active Room:</span>
          <select
            value={counterRoom}
            onChange={(e) => setCounterRoom(e.target.value)}
            className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:ring-2 focus:ring-sky-500"
          >
            {clinic?.rooms?.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            )) || <option value="Room 101">Room 101</option>}
          </select>
        </div>
      </div>

      {/* Alerts */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-800 font-bold">✕</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800 font-bold">✕</button>
        </div>
      )}

      {/* Quick Queue KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Waiting in Queue</div>
            <div className="text-3xl font-extrabold text-amber-600 mt-1">{waitingPatients.length}</div>
          </div>
          <Users className="w-8 h-8 text-amber-300" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Current Token</div>
            <div className="text-3xl font-extrabold text-sky-600 mt-1">
              {activePatientEntry ? activePatientEntry.token_number : 'None'}
            </div>
          </div>
          <PhoneCall className="w-8 h-8 text-sky-300" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Completed Today</div>
            <div className="text-3xl font-extrabold text-emerald-600 mt-1">{completedToday.length}</div>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-300" />
        </div>
      </div>

      {/* Main Clinical Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Patient Console & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Patient Call Station */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Active Patient Consultation Station</h2>
                <p className="text-xs text-slate-500">Atomic server-side queue processing with real-time screen updates</p>
              </div>

              {/* Functional Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Call Next Patient */}
                <button
                  onClick={handleCallNext}
                  disabled={waitingPatients.length === 0}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
                  title="Call next eligible patient in queue"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call Next Patient</span>
                </button>

                {/* 2. Recall Patient */}
                {activePatientEntry && (
                  <button
                    onClick={handleRecall}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
                    title="Recall the called token"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Recall ({activePatientEntry.recall_count || 0})</span>
                  </button>
                )}

                {/* 3. Start Consultation */}
                {activePatientEntry && activePatientEntry.status !== 'consulting' && (
                  <button
                    onClick={handleStartConsultation}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Consultation</span>
                  </button>
                )}

                {/* 4. Complete Consultation */}
                {activePatientEntry && (
                  <button
                    onClick={() => setIsCompleteModalOpen(true)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete Consultation</span>
                  </button>
                )}
              </div>
            </div>

            {/* Currently Active Patient Details */}
            {activePatientEntry ? (
              <div className="p-5 bg-sky-50/60 rounded-xl border border-sky-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl font-black text-sky-900 font-mono">
                      {activePatientEntry.token_number}
                    </span>
                    <StatusBadge status={activePatientEntry.status} type="queue" />
                    <StatusBadge status={activePatientEntry.priority} type="priority" />
                  </div>
                  <div className="text-xs text-slate-500">
                    Checked in: {formatTime(activePatientEntry.checked_in_at)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400">Patient Name:</span>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {selectedPatientHistory?.profile?.full_name || 'Kasun Bandara'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Hospital MRN:</span>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">
                      {selectedPatientHistory?.details?.patient_id || 'PAT-2026-0042'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Allergies:</span>
                    <div className="font-semibold text-rose-600 mt-0.5">
                      {selectedPatientHistory?.details?.allergies?.join(', ') || 'None recorded'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">No patient currently at this station.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Click <strong>Call Next Patient</strong> to call the first waiting patient according to priority rules.
                </p>
              </div>
            )}
          </div>

          {/* Patient Medical History & Consultation Records */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-base">Authorized Patient Medical Records</h3>
              </div>
              <span className="text-xs text-slate-400">Clinical History</span>
            </div>

            {!selectedPatientHistory ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Medical history will load here when a patient is called or selected.
              </p>
            ) : (
              <div className="space-y-4">
                {selectedPatientHistory.consultations.length === 0 ? (
                  <p className="text-xs text-slate-400">No previous consultations recorded for this patient.</p>
                ) : (
                  selectedPatientHistory.consultations.map((c) => (
                    <div key={c.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between items-start font-semibold text-slate-900">
                        <span>Diagnosis: {c.diagnosis}</span>
                        <span className="text-slate-400 font-normal">{formatDate(c.consultation_start)}</span>
                      </div>
                      {c.chief_complaint && (
                        <div>
                          <span className="text-slate-500 font-medium">Chief Complaint: </span>
                          <span className="text-slate-800">{c.chief_complaint}</span>
                        </div>
                      )}
                      {c.clinical_notes && (
                        <div className="p-2 bg-white rounded border border-slate-100 text-slate-700">
                          <strong>Doctor Notes: </strong>
                          {c.clinical_notes}
                        </div>
                      )}
                      {c.prescriptions && c.prescriptions.length > 0 && (
                        <div className="mt-1">
                          <span className="font-semibold text-slate-700">Prescriptions: </span>
                          {c.prescriptions.map((p) =>
                            p.items?.map((item) => (
                              <span key={item.id} className="inline-block bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-[11px] mr-1.5 mt-1">
                                {item.medication_name} ({item.dosage})
                              </span>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Waiting Queue List */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-base">Waiting Queue</h3>
              </div>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
                {waitingPatients.length} Waiting
              </span>
            </div>

            {waitingPatients.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No patients currently waiting in this clinic.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
                {waitingPatients.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 hover:bg-sky-50/70 border border-slate-200 rounded-xl transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-base font-mono">{item.token_number}</span>
                        <StatusBadge status={item.priority} type="priority" />
                      </div>
                      <div className="text-xs text-slate-600 font-medium mt-0.5">
                        {item.patient?.full_name || 'Patient'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Check-in: {formatTime(item.checked_in_at)}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete Consultation Modal */}
      {isCompleteModalOpen && activePatientEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Document & Complete Consultation</h3>
                <p className="text-xs text-slate-400">
                  Token: {activePatientEntry.token_number} • Patient: {selectedPatientHistory?.profile?.full_name}
                </p>
              </div>
              <button
                onClick={() => setIsCompleteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Primary Diagnosis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute Viral Bronchitis / Hypertension Stage 1"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Chief Complaint</label>
                  <input
                    type="text"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="e.g. Cough for 4 days"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Symptoms</label>
                  <input
                    type="text"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="e.g. Fever, sore throat"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Patient Vitals */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">Patient Vitals</label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={vitals.bp}
                    onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                    placeholder="BP (120/80)"
                    className="p-2 border rounded"
                  />
                  <input
                    type="number"
                    value={vitals.pulse}
                    onChange={(e) => setVitals({ ...vitals, pulse: parseInt(e.target.value, 10) })}
                    placeholder="Pulse"
                    className="p-2 border rounded"
                  />
                  <input
                    type="text"
                    value={vitals.temp}
                    onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                    placeholder="Temp °C"
                    className="p-2 border rounded"
                  />
                  <input
                    type="number"
                    value={vitals.spo2}
                    onChange={(e) => setVitals({ ...vitals, spo2: parseInt(e.target.value, 10) })}
                    placeholder="SpO2 %"
                    className="p-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Clinical Notes & Recommendations</label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Document clinical observations, lifestyle advice, or referral details..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Follow-up Schedule</label>
                <select
                  value={followUpDays}
                  onChange={(e) => setFollowUpDays(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="7">In 1 Week (7 Days)</option>
                  <option value="14">In 2 Weeks (14 Days)</option>
                  <option value="30">In 1 Month (30 Days)</option>
                  <option value="0">No Follow-up Required</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setIsCompleteModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteConsultation}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Save & Complete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
