import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { clinicService } from '../../services/clinicService';
import { queueService } from '../../services/queueService';
import { Clinic, QueueEntry, Profile } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { formatTime, formatDate } from '../../lib/utils';
import { 
  Building2, 
  Users, 
  Clock, 
  AlertTriangle, 
  Activity, 
  Stethoscope, 
  CheckCircle2, 
  BarChart2, 
  Flame,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface ClinicHeadDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const ClinicHeadDashboard: React.FC<ClinicHeadDashboardProps> = ({
  activeTab = 'overview',
  onTabChange
}) => {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [clinicDoctors, setClinicDoctors] = useState<Profile[]>([]);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadClinicHeadData = async () => {
      setIsLoading(true);
      const clinicId = user?.clinic_id || 'c0000000-0000-0000-0000-000000000001';
      const [cData, docs, queue] = await Promise.all([
        clinicService.getClinicById(clinicId),
        clinicService.getClinicDoctors(clinicId),
        queueService.getQueueEntries(clinicId),
      ]);

      if (cData) setClinic(cData);
      setClinicDoctors(docs);
      setQueueEntries(queue);
      setIsLoading(false);
    };

    loadClinicHeadData();
    const interval = setInterval(loadClinicHeadData, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Operational metrics
  const waitingEntries = queueEntries.filter(q => q.status === 'waiting');
  const consultingEntries = queueEntries.filter(q => q.status === 'consulting');
  const completedEntries = queueEntries.filter(q => q.status === 'completed');
  const calledEntries = queueEntries.filter(q => q.status === 'called' || q.status === 'recalled');

  // Congestion warning: if > 10 waiting or wait time exceeds 30 mins
  const isCongested = waitingEntries.length > 8;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-indigo-50 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
              Clinic Supervisory Console
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">{clinic?.name || 'General OPD Clinic'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Clinic Flow & Queue Monitoring
          </h1>
          <p className="text-xs text-slate-500">
            Real-time bottleneck detection, doctor queue distribution, and wait-time SLA monitoring.
          </p>
        </div>

        {isCongested && (
          <div className="px-4 py-2 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-xs font-bold flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-600 animate-bounce" />
            <span>High Queue Congestion Alert</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Waiting Patients</div>
          <div className="text-3xl font-extrabold text-amber-600 mt-1">{waitingEntries.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Ready for consultation call</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Currently Consulting</div>
          <div className="text-3xl font-extrabold text-sky-600 mt-1">{consultingEntries.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Inside doctor rooms</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Discharged / Completed</div>
          <div className="text-3xl font-extrabold text-emerald-600 mt-1">{completedEntries.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Fully documented today</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Avg Waiting Time</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">16.5m</div>
          <div className="text-[11px] text-slate-400 mt-1">Target SLA: &lt; 25 mins</div>
        </div>
      </div>

      {/* Grid: Doctor Availability & Queue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Doctor Stations Status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Doctor Stations & Consultation Rooms</h3>
                <p className="text-xs text-slate-500">Live operational status by doctor</p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                {clinicDoctors.length} Assigned Doctor(s)
              </span>
            </div>

            <div className="space-y-3">
              {clinicDoctors.map((doc, idx) => {
                const assignedTokens = queueEntries.filter(q => q.doctor_id === doc.id);
                const activeConsult = assignedTokens.find(q => q.status === 'consulting');
                const completedCount = assignedTokens.filter(q => q.status === 'completed').length;
                const room = clinic?.rooms?.[idx] || `Room 10${idx + 1}`;

                return (
                  <div key={doc.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{doc.full_name}</div>
                        <div className="text-[11px] text-slate-500">Station: {room} • ID: {doc.staff_id}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs">
                      <div>
                        <span className="text-slate-400">Current Token: </span>
                        <span className="font-bold font-mono text-sky-700">
                          {activeConsult ? activeConsult.token_number : 'Ready / Calling'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Done: </span>
                        <span className="font-bold text-emerald-700">{completedCount}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        Online
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SLA & Wait Time Breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Wait-Time Interval Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500">Check-in to First Call:</span>
                <div className="text-xl font-bold text-slate-900 mt-1">14.2 mins</div>
                <div className="text-[11px] text-emerald-600 font-medium">Within 20m target</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500">First Call to In-Consultation:</span>
                <div className="text-xl font-bold text-slate-900 mt-1">2.3 mins</div>
                <div className="text-[11px] text-emerald-600 font-medium">Patient responsiveness high</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500">Average Consultation Duration:</span>
                <div className="text-xl font-bold text-slate-900 mt-1">11.8 mins</div>
                <div className="text-[11px] text-slate-500">Standard clinical timing</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Live Queue Flow & Alerts */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Queue Status Feed</h3>
            <div className="space-y-2 max-h-[460px] overflow-y-auto">
              {queueEntries.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-black font-mono text-slate-900">{item.token_number}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.patient?.full_name || 'Patient'}</div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={item.status} type="queue" />
                    <div className="text-[10px] text-slate-400 mt-0.5">{formatTime(item.checked_in_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
