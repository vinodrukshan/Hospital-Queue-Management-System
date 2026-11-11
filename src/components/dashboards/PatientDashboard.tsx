import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { queueService } from '../../services/queueService';
import { patientService } from '../../services/patientService';
import { QueueEntry, Appointment, Consultation, LaboratoryReport, Patient } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { PrintTokenModal } from '../common/PrintTokenModal';
import { formatDateTime, formatDate, formatTime } from '../../lib/utils';
import { 
  Ticket, 
  Calendar, 
  Clock, 
  MapPin, 
  Printer, 
  FileText, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  Eye, 
  Info,
  User,
  HeartPulse
} from 'lucide-react';

interface PatientDashboardProps {
  activeTab?: string;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ activeTab = 'overview' }) => {
  const { user } = useAuth();
  const [patientDetails, setPatientDetails] = useState<Patient | null>(null);
  const [token, setToken] = useState<QueueEntry | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [labReports, setLabReports] = useState<LaboratoryReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<LaboratoryReport | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPatientData = async () => {
      if (!user) return;
      setIsLoading(true);

      const [profData, tokenData, appts, consults, reports] = await Promise.all([
        patientService.getPatientProfile(user.id),
        queueService.getPatientQueueToken(user.id),
        patientService.getPatientAppointments(user.id),
        patientService.getPatientConsultations(user.id),
        patientService.getPatientLabReports(user.id),
      ]);

      if (profData?.details) {
        setPatientDetails(profData.details);
      }
      setToken(tokenData);
      setAppointments(appts);
      setConsultations(consults);
      setLabReports(reports);
      setIsLoading(false);
    };

    loadPatientData();

    // Re-check periodically or on queue events
    const interval = setInterval(loadPatientData, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Calculate estimated wait time
  const getEstimatedWaitTime = () => {
    if (!token || token.status !== 'waiting') return null;
    // Estimated ~8 mins per patient ahead
    const minutes = Math.max(5, (token.sequence_number % 5 || 2) * 8);
    return `~${minutes} minutes`;
  };

  const showToken = activeTab === 'overview' || activeTab === 'token';
  const showAppointments = activeTab === 'overview' || activeTab === 'appointments';
  const showHistory = activeTab === 'overview' || activeTab === 'history';
  const showReports = activeTab === 'overview' || activeTab === 'reports';

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 max-w-6xl mx-auto">
        <div className="h-28 bg-slate-200 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-200 animate-pulse rounded-2xl md:col-span-2" />
          <div className="h-64 bg-slate-200 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Patient Welcome & Identity Card */}
      <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-teal-600 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full uppercase tracking-wider backdrop-blur-xs">
                Patient Portal
              </span>
              <span className="text-xs text-white/80">MRN: {patientDetails?.patient_id || 'PAT-2026-0042'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1.5">{user?.full_name}</h1>
            <p className="text-sm text-sky-100 mt-1">
              National ID: {user?.national_id || '198816600123'} • Phone: {user?.phone || '+94 71 888 1234'} • Blood Group: {patientDetails?.blood_group || 'O+'}
            </p>
          </div>

          {token && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center space-x-4">
              <div className="text-center">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-100">Live Queue Token</div>
                <div className="text-3xl font-black tracking-tight text-white">{token.token_number}</div>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3 py-2 bg-white text-sky-800 hover:bg-sky-50 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Token</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live Token Status Banner */}
      {showToken && (
        token ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Your Current Clinic Token</h2>
                <p className="text-xs text-slate-500">Official token issued by Reception Desk</p>
              </div>
            </div>
            <StatusBadge status={token.status} type="queue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 flex items-center">
                <Activity className="w-4 h-4 mr-1.5 text-sky-600" />
                Assigned Clinic
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1">{token.clinic?.name || 'General OPD'}</div>
              <div className="text-xs text-slate-500 mt-0.5">Counter / Room: {token.counter_or_room || 'Room 101'}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 flex items-center">
                <Clock className="w-4 h-4 mr-1.5 text-amber-600" />
                Estimated Wait
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {getEstimatedWaitTime() || 'Now Calling'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Status: {token.status.toUpperCase()}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 flex items-center">
                <MapPin className="w-4 h-4 mr-1.5 text-emerald-600" />
                Where to Go
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1">Waiting Area A</div>
              <div className="text-xs text-slate-500 mt-0.5">Proceed when called on screen</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div className="text-xs text-slate-500">Official Receipt</div>
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="w-full mt-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>View & Print Ticket</span>
              </button>
            </div>
          </div>

          {token.status === 'called' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center space-x-3 text-blue-900 animate-pulse">
              <AlertCircle className="w-6 h-6 text-blue-600 shrink-0" />
              <div>
                <div className="font-bold text-sm">YOUR NUMBER IS BEING CALLED NOW!</div>
                <div className="text-xs">
                  Please proceed immediately to <strong>{token.counter_or_room || 'Room 101'}</strong> for your consultation.
                </div>
              </div>
            </div>
          )}

          {token.status === 'recalled' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-3 text-rose-900 animate-pulse">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <div className="font-bold text-sm">SECOND CALL / RECALL NOTICE!</div>
                <div className="text-xs">
                  You are being recalled to <strong>{token.counter_or_room || 'Room 101'}</strong>. Please report to the doctor immediately.
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center space-y-2">
          <Ticket className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="font-bold text-slate-800 text-base">No Active Queue Token</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You do not currently have an active waiting queue token for today. When you arrive at the clinic, please check in at the Reception Desk to receive your official token number.
          </p>
        </div>
      ))}

      {/* Main Tabs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Appointments & Medical History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today & Upcoming Appointments */}
          {showAppointments && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-base">My Appointments</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">{appointments.length} record(s)</span>
            </div>

            {appointments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No scheduled appointments found.</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900">{appt.clinic?.name || 'General Clinic'}</span>
                        <StatusBadge status={appt.status} type="appointment" />
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
                        <span>Date: {formatDate(appt.appointment_date)}</span>
                        <span>•</span>
                        <span>Time: {formatTime(appt.appointment_time)}</span>
                        {appt.doctor && (
                          <>
                            <span>•</span>
                            <span>Doctor: {appt.doctor.full_name}</span>
                          </>
                        )}
                      </div>
                      {appt.reason && <div className="text-xs text-slate-600 mt-1 italic font-sans">"{appt.reason}"</div>}
                    </div>

                    <div className="text-xs text-slate-500">
                      ID: <span className="font-mono font-medium text-slate-700">{appt.appointment_number}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Past Consultations & Prescriptions */}
          {showHistory && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-base">Consultation & Prescription History</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">{consultations.length} past visit(s)</span>
            </div>

            {consultations.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No past consultations recorded.</p>
            ) : (
              <div className="space-y-4">
                {consultations.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{c.diagnosis}</div>
                        <div className="text-xs text-slate-500">
                          {c.clinic?.name || 'Clinic'} • Consultant: {c.doctor?.full_name || 'Medical Officer'}
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{formatDate(c.consultation_start)}</span>
                    </div>

                    {c.clinical_notes && (
                      <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">Clinical Notes: </span>
                        {c.clinical_notes}
                      </div>
                    )}

                    {c.vitals && (
                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                        {c.vitals.bp && <span className="px-2 py-0.5 bg-slate-100 rounded">BP: {c.vitals.bp}</span>}
                        {c.vitals.pulse && <span className="px-2 py-0.5 bg-slate-100 rounded">Pulse: {c.vitals.pulse} bpm</span>}
                        {c.vitals.temp && <span className="px-2 py-0.5 bg-slate-100 rounded">Temp: {c.vitals.temp}°C</span>}
                        {c.vitals.spo2 && <span className="px-2 py-0.5 bg-slate-100 rounded">SpO2: {c.vitals.spo2}%</span>}
                      </div>
                    )}

                    {c.prescriptions && c.prescriptions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-800 mb-1">Prescribed Medications:</div>
                        <div className="space-y-1">
                          {c.prescriptions.map((pr) =>
                            pr.items?.map((item) => (
                              <div key={item.id} className="text-xs text-slate-700 flex items-center justify-between bg-sky-50/50 p-1.5 rounded">
                                <span className="font-medium text-sky-900">
                                  {item.medication_name} ({item.dosage})
                                </span>
                                <span className="text-slate-500">{item.frequency} • {item.duration}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Right Column: Lab Reports & Patient Alerts */}
        <div className="space-y-6">
          {/* Laboratory & Investigation Reports */}
          {showReports && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <HeartPulse className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-slate-900 text-base">Authorized Lab Reports</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">{labReports.length}</span>
            </div>

            {labReports.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No authorized lab reports available.</p>
            ) : (
              <div className="space-y-3">
                {labReports.map((rpt) => (
                  <div
                    key={rpt.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/70 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{rpt.test_name}</div>
                        <div className="text-[11px] text-slate-500">{rpt.test_category} • {formatDate(rpt.report_date)}</div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        {rpt.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">{rpt.result_summary}</p>

                    <button
                      onClick={() => setSelectedReport(rpt)}
                      className="w-full py-1.5 px-2.5 bg-white border border-slate-200 hover:bg-sky-50 hover:border-sky-200 text-sky-700 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Full Test Report</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Hospital Patient Instructions */}
          <div className="bg-sky-50 rounded-2xl p-5 border border-sky-100 space-y-3">
            <div className="flex items-center space-x-2 text-sky-900 font-bold text-sm">
              <Info className="w-4 h-4 text-sky-600" />
              <span>Queue Guidelines</span>
            </div>
            <ul className="text-xs text-sky-950 space-y-2 list-disc list-inside">
              <li>Official tokens are generated at the reception check-in desk upon arrival.</li>
              <li>Keep an eye on the waiting hall screen boards.</li>
              <li>When your token appears on screen, proceed directly to the indicated room.</li>
              <li>If you miss your call, wait for your recall announcement.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Print Token Modal */}
      <PrintTokenModal
        token={token}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        clinicName={token?.clinic?.name}
        patientName={user?.full_name}
      />

      {/* Full Lab Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{selectedReport.test_name}</h3>
                <p className="text-xs text-slate-400">Report Ref: {selectedReport.report_number}</p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div><strong>Category:</strong> {selectedReport.test_category}</div>
                <div><strong>Date Reported:</strong> {formatDate(selectedReport.report_date)}</div>
                <div><strong>Authorization:</strong> Signed by Senior Pathologist</div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Detailed Test Results:</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2">Parameter</th>
                        <th className="p-2">Result</th>
                        <th className="p-2">Unit</th>
                        <th className="p-2">Ref Range</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {selectedReport.results_data?.map((row, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium">{row.test}</td>
                          <td className="p-2 font-bold">{row.result}</td>
                          <td className="p-2 text-slate-500">{row.unit}</td>
                          <td className="p-2 text-slate-500">{row.reference_range}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-900">Summary: </span>
                {selectedReport.result_summary}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
