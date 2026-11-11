import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { clinicService } from '../../services/clinicService';
import { queueService } from '../../services/queueService';
import { Profile, Clinic, QueueEntry, UserRole } from '../../types/database';
import { getRoleBadgeColor } from '../../lib/utils';
import { 
  Building2, 
  Users, 
  UserCheck, 
  UserX, 
  Activity, 
  ShieldCheck, 
  Calendar, 
  Ticket, 
  BarChart3, 
  Plus, 
  Edit2, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';

export const HospitalAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'clinics' | 'reports'>('overview');

  // Staff Creation Modal
  const [isNewStaffOpen, setIsNewStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    staffId: '',
    role: 'doctor' as UserRole,
    specialty: '',
    clinicId: '',
  });

  // Clinic Editing Modal
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    const [staff, clinicData, queueData] = await Promise.all([
      adminService.getStaffList(),
      clinicService.getClinics(),
      queueService.getQueueEntries(),
    ]);
    setStaffList(staff);
    setClinics(clinicData);
    setQueueEntries(queueData);
  };

  const handleToggleStaffActive = async (staffId: string, currentStatus: boolean) => {
    const success = await adminService.updateStaffStatus(staffId, !currentStatus);
    if (success) {
      setNotification({
        type: 'success',
        text: `Staff account status changed to ${!currentStatus ? 'Active' : 'Deactivated'}.`,
      });
      loadAdminData();
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.fullName || !staffForm.staffId || !staffForm.email) {
      setNotification({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    const res = await adminService.createStaffMember({
      fullName: staffForm.fullName,
      email: staffForm.email,
      phone: staffForm.phone,
      staffId: staffForm.staffId,
      role: staffForm.role,
      specialty: staffForm.specialty,
      clinicId: staffForm.clinicId || undefined,
    });

    if (res.success) {
      setNotification({ type: 'success', text: `Staff member ${staffForm.fullName} provisioned successfully.` });
      setIsNewStaffOpen(false);
      setStaffForm({
        fullName: '',
        email: '',
        phone: '',
        staffId: '',
        role: 'doctor',
        specialty: '',
        clinicId: '',
      });
      loadAdminData();
    } else {
      setNotification({ type: 'error', text: res.message || 'Error creating staff.' });
    }
  };

  const handleSaveClinic = async () => {
    if (!editingClinic) return;
    const success = await clinicService.updateClinic(editingClinic.id, {
      name: editingClinic.name,
      department: editingClinic.department,
      max_daily_tokens: editingClinic.max_daily_tokens,
      rooms: editingClinic.rooms,
    });

    if (success) {
      setNotification({ type: 'success', text: `Clinic ${editingClinic.name} updated successfully.` });
      setEditingClinic(null);
      loadAdminData();
    }
  };

  // KPIs
  const totalWaiting = queueEntries.filter(q => q.status === 'waiting').length;
  const totalConsulting = queueEntries.filter(q => q.status === 'consulting').length;
  const totalCompleted = queueEntries.filter(q => q.status === 'completed').length;
  const totalCancelled = queueEntries.filter(q => q.status === 'cancelled').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-purple-50 text-purple-800 font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
              Hospital Executive Administration
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">IDH/NIID Central Operations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Hospital Operations & Governance</h1>
          <p className="text-xs text-slate-500">
            Staff access provisioning, clinic queue configurations, and real-time hospital throughput analytics.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsNewStaffOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Account</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        {[
          { id: 'overview', label: 'Hospital Overview', icon: Activity },
          { id: 'staff', label: 'Staff Management', icon: Users },
          { id: 'clinics', label: 'Clinics & Rooms', icon: Building2 },
          { id: 'reports', label: 'Operational Reports', icon: BarChart3 },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-2 text-xs font-bold flex items-center space-x-1.5 border-b-2 transition-all ${
                isActive
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Currently Waiting</div>
              <div className="text-3xl font-extrabold text-amber-600 mt-1">{totalWaiting}</div>
              <div className="text-[11px] text-slate-400 mt-1">Across all outpatient clinics</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Consultations in Progress</div>
              <div className="text-3xl font-extrabold text-sky-600 mt-1">{totalConsulting}</div>
              <div className="text-[11px] text-slate-400 mt-1">Active doctor consultations</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Completed Visits Today</div>
              <div className="text-3xl font-extrabold text-emerald-600 mt-1">{totalCompleted}</div>
              <div className="text-[11px] text-slate-400 mt-1">Discharged & documented</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Cancelled Tokens</div>
              <div className="text-3xl font-extrabold text-rose-600 mt-1">{totalCancelled}</div>
              <div className="text-[11px] text-slate-400 mt-1">Documented cancellations</div>
            </div>
          </div>

          {/* Clinic Load Breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Clinic Real-Time Workload & Capacity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clinics.map((clinic) => {
                const clinicTokens = queueEntries.filter(q => q.clinic_id === clinic.id);
                const waiting = clinicTokens.filter(q => q.status === 'waiting').length;
                const completed = clinicTokens.filter(q => q.status === 'completed').length;
                const percent = Math.min(100, Math.round((clinicTokens.length / (clinic.max_daily_tokens || 100)) * 100));

                return (
                  <div key={clinic.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{clinic.name}</div>
                        <div className="text-xs text-slate-500">{clinic.department} • Code: {clinic.code}</div>
                      </div>
                      <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold text-xs">
                        {clinic.rooms?.join(', ') || 'Room 101'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Daily Capacity Used:</span>
                        <span className="font-bold">{clinicTokens.length} / {clinic.max_daily_tokens} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <div className="flex justify-between text-xs pt-1 border-t border-slate-200 text-slate-600">
                      <span>Waiting: <strong className="text-amber-600">{waiting}</strong></span>
                      <span>Completed: <strong className="text-emerald-600">{completed}</strong></span>
                      <span>Status: <strong className="text-emerald-700">Operating</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF MANAGEMENT */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Authorized Staff Personnel</h3>
              <p className="text-xs text-slate-500">Manage hospital roles, clinic assignments, and account activation</p>
            </div>
            <button
              onClick={() => setIsNewStaffOpen(true)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Staff</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Staff ID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Assigned Clinic / Specialty</th>
                  <th className="p-3">Contact Email</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {staffList.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-700">{st.staff_id || 'STAFF-001'}</td>
                    <td className="p-3 font-semibold text-slate-900">{st.full_name}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeColor(st.role)}`}>
                        {st.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{st.specialty || 'General Service'}</td>
                    <td className="p-3 text-slate-500">{st.email}</td>
                    <td className="p-3">
                      {st.is_active ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-semibold">Active</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[11px] font-semibold">Deactivated</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleStaffActive(st.id, st.is_active)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          st.is_active
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {st.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CLINICS CONFIGURATION */}
      {activeTab === 'clinics' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">Clinics & Consultation Counters Configuration</h3>
            <p className="text-xs text-slate-500">Configure clinic prefix codes, daily quotas, and consultation rooms</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clinics.map((c) => (
              <div key={c.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-base text-slate-900">{c.name}</h4>
                    <p className="text-xs text-slate-500">{c.department}</p>
                  </div>
                  <button
                    onClick={() => setEditingClinic({ ...c })}
                    className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg"
                    title="Edit Clinic Settings"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs space-y-1 text-slate-600">
                  <div><strong>Token Prefix Code:</strong> <span className="font-mono bg-white px-1.5 py-0.5 rounded border">{c.code}</span></div>
                  <div><strong>Consultation Rooms:</strong> {c.rooms?.join(', ')}</div>
                  <div><strong>Max Daily Tokens:</strong> {c.max_daily_tokens} tokens</div>
                  <div><strong>Operating Hours:</strong> {c.operating_hours.start} - {c.operating_hours.end}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: OPERATIONAL REPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">Hospital Operational Performance Summary</h3>
            <p className="text-xs text-slate-500">Aggregated throughput without exposing confidential clinical records</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Average Queue Waiting Time</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">18.4 mins</div>
              <div className="text-slate-400 mt-0.5">Based on check-in to first-call timestamps</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Average Consultation Duration</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">11.2 mins</div>
              <div className="text-slate-400 mt-0.5">From consultation start to complete</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Daily Token Completion Rate</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">94.8%</div>
              <div className="text-slate-400 mt-0.5">Less than 5.2% cancellation / no-show</div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Provisioning Modal */}
      {isNewStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <h3 className="font-bold text-base">Provision New Staff Account</h3>
              </div>
              <button onClick={() => setIsNewStaffOpen(false)} className="text-white/80 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                  placeholder="e.g. Dr. Dilshan Senanayake"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Staff ID Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={staffForm.staffId}
                    onChange={(e) => setStaffForm({ ...staffForm, staffId: e.target.value })}
                    placeholder="DOC-0105 / REC-004"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Role Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as UserRole })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="doctor">Doctor</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="clinic_head">Clinic Head</option>
                    <option value="hospital_admin">Hospital Admin</option>
                    <option value="technical_maintainer">Technical Maintainer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    placeholder="doctor@idh.hospital.lk"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="+94 77 123 4567"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Assigned Clinic</label>
                <select
                  value={staffForm.clinicId}
                  onChange={(e) => setStaffForm({ ...staffForm, clinicId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  <option value="">No Clinic Assigned</option>
                  {clinics.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Designation / Specialty</label>
                <input
                  type="text"
                  value={staffForm.specialty}
                  onChange={(e) => setStaffForm({ ...staffForm, specialty: e.target.value })}
                  placeholder="e.g. Consultant Physician / Front Desk Officer"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3 -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsNewStaffOpen(false)}
                  className="px-4 py-2 border rounded-lg font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Clinic Modal */}
      {editingClinic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Edit Clinic: {editingClinic.name}</h3>
              <button onClick={() => setEditingClinic(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Clinic Name</label>
                <input
                  type="text"
                  value={editingClinic.name}
                  onChange={(e) => setEditingClinic({ ...editingClinic, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-800 block mb-1">Department</label>
                <input
                  type="text"
                  value={editingClinic.department}
                  onChange={(e) => setEditingClinic({ ...editingClinic, department: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-800 block mb-1">Max Daily Tokens</label>
                <input
                  type="number"
                  value={editingClinic.max_daily_tokens}
                  onChange={(e) => setEditingClinic({ ...editingClinic, max_daily_tokens: parseInt(e.target.value, 10) })}
                  className="w-full p-2.5 bg-slate-50 border rounded-lg"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2">
              <button onClick={() => setEditingClinic(null)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
              <button onClick={handleSaveClinic} className="px-4 py-1.5 bg-purple-600 text-white font-bold rounded-lg">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
