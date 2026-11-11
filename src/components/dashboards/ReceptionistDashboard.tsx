import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import { queueService, subscribeLocalQueue } from '../../services/queueService';
import { clinicService } from '../../services/clinicService';
import { hardwareService } from '../../services/hardwareService';
import { Profile, Clinic, QueueEntry, PriorityLevel } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { PrintTokenModal } from '../common/PrintTokenModal';
import { formatDateTime, formatDate, formatTime } from '../../lib/utils';
import { 
  UserPlus, 
  Search, 
  Ticket, 
  Printer, 
  Scan, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Building2, 
  Phone, 
  Calendar,
  AlertOctagon
} from 'lucide-react';

export const ReceptionistDashboard: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Array<Profile & { patient_data?: any }>>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [activeQueue, setActiveQueue] = useState<QueueEntry[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');

  // Patient Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regForm, setRegForm] = useState({
    fullName: '',
    phone: '',
    nationalId: '',
    dateOfBirth: '1990-01-01',
    gender: 'male' as 'male' | 'female' | 'other',
    bloodGroup: 'O+',
    allergies: '',
    address: '',
    emergencyContact: '',
  });

  // Token Generation State
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedPatientForToken, setSelectedPatientForToken] = useState<Profile | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel>('normal');
  const [tokenGeneratedSuccess, setTokenGeneratedSuccess] = useState<QueueEntry | null>(null);

  // Cancellation Dialog State
  const [cancelModalEntry, setCancelModalEntry] = useState<QueueEntry | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Print Token Modal
  const [printToken, setPrintToken] = useState<QueueEntry | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Feedback notifications
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      const clinicList = await clinicService.getClinics();
      setClinics(clinicList);
      if (clinicList.length > 0) {
        setSelectedClinicId(clinicList[0].id);
      }
      refreshQueue();
    };

    loadInitialData();

    // Attach barcode scanner hardware wedge listener
    const detachScanner = hardwareService.attachScannerListener((barcode) => {
      setSearchTerm(barcode);
      handleSearch(barcode);
    });

    const unsubQueue = subscribeLocalQueue(() => {
      refreshQueue();
    });

    return () => {
      detachScanner();
      unsubQueue();
    };
  }, []);

  const refreshQueue = async () => {
    const list = await queueService.getQueueEntries();
    setActiveQueue(list);
  };

  const handleSearch = async (term?: string) => {
    const q = term !== undefined ? term : searchTerm;
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    const results = await patientService.searchPatients(q);
    setSearchResults(results);
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.fullName || !regForm.phone) {
      setBannerMessage({ type: 'error', text: 'Full Name and Phone Number are required.' });
      return;
    }

    const res = await patientService.registerPatient({
      fullName: regForm.fullName,
      phone: regForm.phone,
      nationalId: regForm.nationalId,
      dateOfBirth: regForm.dateOfBirth,
      gender: regForm.gender,
      bloodGroup: regForm.bloodGroup,
      allergies: regForm.allergies ? regForm.allergies.split(',').map(s => s.trim()) : [],
      address: regForm.address,
      emergencyContact: regForm.emergencyContact,
    });

    if (!res.success) {
      setBannerMessage({ type: 'error', text: res.message || 'Error registering patient.' });
    } else {
      setBannerMessage({ type: 'success', text: `Patient ${regForm.fullName} successfully registered!` });
      setIsRegisterOpen(false);
      setSearchTerm(regForm.phone);
      handleSearch(regForm.phone);
      setRegForm({
        fullName: '',
        phone: '',
        nationalId: '',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        bloodGroup: 'O+',
        allergies: '',
        address: '',
        emergencyContact: '',
      });
    }
  };

  const handleOpenTokenModal = (patient: Profile) => {
    setSelectedPatientForToken(patient);
    setSelectedPriority('normal');
    setIsGenerateOpen(true);
  };

  const handleGenerateOfficialToken = async () => {
    if (!selectedPatientForToken || !selectedClinicId) return;

    // Check-in or create walk-in visit id
    const dummyVisitId = 'v-' + Math.random().toString(36).substring(2, 9);

    const res = await queueService.generateToken({
      clinicId: selectedClinicId,
      patientId: selectedPatientForToken.id,
      visitId: dummyVisitId,
      priority: selectedPriority,
      createdBy: user?.id,
    });

    if (!res.success) {
      setBannerMessage({ type: 'error', text: res.message || 'Duplicate or invalid token generation.' });
    } else if (res.data) {
      setTokenGeneratedSuccess(res.data);
      setPrintToken(res.data);
      setIsGenerateOpen(false);
      setPrintModalOpen(true);
      setBannerMessage({ type: 'success', text: `Official Token ${res.data.token_number} generated successfully!` });
      refreshQueue();
    }
  };

  const handleCancelToken = async () => {
    if (!cancelModalEntry || !cancelReason.trim()) {
      setBannerMessage({ type: 'error', text: 'An authorized cancellation reason is strictly required.' });
      return;
    }

    const res = await queueService.cancelQueueToken(cancelModalEntry.id, cancelReason, user?.id || 'reception');
    if (res.success) {
      setBannerMessage({ type: 'success', text: `Token ${cancelModalEntry.token_number} cancelled.` });
      setCancelModalEntry(null);
      setCancelReason('');
      refreshQueue();
    } else {
      setBannerMessage({ type: 'error', text: res.message || 'Failed to cancel token.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Reception Desk Console
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">IDH/NIID Main Entrance Check-in</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Patient Check-in & Queue Registration</h1>
          <p className="text-xs text-slate-500">
            Search patient records, register walk-ins, and generate official queue tokens.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Banner Feedback */}
      {bannerMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {bannerMessage.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span className="font-medium">{bannerMessage.text}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="font-bold text-slate-500 hover:text-slate-800">✕</button>
        </div>
      )}

      {/* Patient Search & Barcode Scan Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="Search by Patient Name, Phone, National ID (NIC), or Hospital MRN..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
            <Scan className="w-4 h-4 text-emerald-600" />
            <span>USB Barcode Scanner Ready</span>
          </div>
        </div>

        {/* Search Results List */}
        {searchResults.length > 0 && (
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-slate-50/50">
            <div className="p-2.5 bg-slate-100 text-[11px] font-bold text-slate-600">
              Found {searchResults.length} matching patient profile(s):
            </div>
            {searchResults.map((p) => (
              <div key={p.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors">
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center space-x-2">
                    <span>{p.full_name}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded">
                      {p.patient_data?.patient_id || 'PAT-2026-0042'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3">
                    <span>Phone: {p.phone || 'N/A'}</span>
                    <span>NIC: {p.national_id || 'N/A'}</span>
                    <span>Blood: {p.patient_data?.blood_group || 'O+'}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenTokenModal(p)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors self-start sm:self-auto"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Check In & Issue Token</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hospital Live Queue Overview */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Active Hospital Queue Overview</h3>
            <p className="text-xs text-slate-500">Live tokens across all outpatient clinics</p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Filter Clinic:</span>
            <select
              value={selectedClinicId}
              onChange={(e) => setSelectedClinicId(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5"
            >
              <option value="">All Clinics</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {activeQueue.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No active queue entries today.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Token #</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Clinic</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Check-in Time</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {activeQueue
                  .filter(q => (!selectedClinicId || q.clinic_id === selectedClinicId))
                  .map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-sky-800 text-sm">{entry.token_number}</td>
                      <td className="p-3 font-medium text-slate-900">{entry.patient?.full_name || 'Kasun Bandara'}</td>
                      <td className="p-3 text-slate-600">{entry.clinic?.name || 'General OPD'}</td>
                      <td className="p-3">
                        <StatusBadge status={entry.priority} type="priority" />
                      </td>
                      <td className="p-3">
                        <StatusBadge status={entry.status} type="queue" />
                      </td>
                      <td className="p-3 text-slate-500 font-mono">{formatTime(entry.checked_in_at)}</td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setPrintToken(entry);
                            setPrintModalOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded"
                          title="Print Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {entry.status !== 'completed' && entry.status !== 'cancelled' && (
                          <button
                            onClick={() => setCancelModalEntry(entry)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Cancel Token"
                          >
                            <AlertOctagon className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Registration Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-bold text-base">Register New Hospital Patient</h3>
              </div>
              <button onClick={() => setIsRegisterOpen(false)} className="text-white/80 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleRegisterPatient} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regForm.fullName}
                  onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                  placeholder="e.g. Ruwanthi Jayasuriya"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    placeholder="+94 77 123 4567"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">National ID (NIC)</label>
                  <input
                    type="text"
                    value={regForm.nationalId}
                    onChange={(e) => setRegForm({ ...regForm, nationalId: e.target.value })}
                    placeholder="199512345678"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={regForm.dateOfBirth}
                    onChange={(e) => setRegForm({ ...regForm, dateOfBirth: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Gender</label>
                  <select
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Blood Group</label>
                  <select
                    value={regForm.bloodGroup}
                    onChange={(e) => setRegForm({ ...regForm, bloodGroup: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Known Allergies (comma separated)</label>
                <input
                  type="text"
                  value={regForm.allergies}
                  onChange={(e) => setRegForm({ ...regForm, allergies: e.target.value })}
                  placeholder="e.g. Penicillin, Aspirin"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Residential Address</label>
                <input
                  type="text"
                  value={regForm.address}
                  onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                  placeholder="Street address, City"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3 -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
                >
                  Save Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Token Generation Modal */}
      {isGenerateOpen && selectedPatientForToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Ticket className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Generate Official Queue Token</h3>
              </div>
              <button onClick={() => setIsGenerateOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400">Patient:</span>
                <div className="font-bold text-sm text-slate-900">{selectedPatientForToken.full_name}</div>
                <div className="text-[11px] text-slate-500">Phone: {selectedPatientForToken.phone}</div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Target Clinic</label>
                <select
                  value={selectedClinicId}
                  onChange={(e) => setSelectedClinicId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                >
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Priority Categorization</label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as PriorityLevel)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="normal">Normal Outpatient</option>
                  <option value="elderly">Elderly Patient (Priority)</option>
                  <option value="child">Child / Pediatric Case</option>
                  <option value="urgent">Urgent / Fast-track</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                Note: Generating this token will immediately broadcast to the doctor console and waiting hall digital screen.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setIsGenerateOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateOfficialToken}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center space-x-1.5 shadow-sm"
              >
                <Ticket className="w-4 h-4" />
                <span>Generate & Print Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Token Modal */}
      {cancelModalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <h3 className="font-bold text-base text-rose-600 flex items-center space-x-2">
              <AlertOctagon className="w-5 h-5" />
              <span>Cancel Token {cancelModalEntry.token_number}</span>
            </h3>
            <p className="text-slate-600">
              Please enter an authorized reason for token cancellation. This action will be logged in the hospital audit trail.
            </p>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Patient departed early / duplicate check-in by error..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setCancelModalEntry(null)}
                className="px-3 py-1.5 border rounded-lg text-slate-600"
              >
                Close
              </button>
              <button
                onClick={handleCancelToken}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Token Modal */}
      <PrintTokenModal
        token={printToken}
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        clinicName={printToken?.clinic?.name || 'General OPD'}
        patientName={printToken?.patient?.full_name}
      />
    </div>
  );
};
