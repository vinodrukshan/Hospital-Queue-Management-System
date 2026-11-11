import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { adminService } from '../../services/adminService';
import { checkSupabaseConnection, isSupabaseConfigured } from '../../lib/supabase';
import { Device, SystemHealthLog } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { formatDateTime, timeAgo } from '../../lib/utils';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Tv, 
  Printer, 
  Scan, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Terminal, 
  ShieldCheck,
  Server
} from 'lucide-react';

export const TechnicalMaintainerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { connectionStatus, lastPingMs } = useRealtime();
  const [devices, setDevices] = useState<Device[]>([]);
  const [healthLogs, setHealthLogs] = useState<SystemHealthLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; latency: number; error?: string }>({
    connected: false,
    latency: 0,
  });

  const checkHealth = async () => {
    setIsRefreshing(true);
    const [devs, logs, dbHealth] = await Promise.all([
      adminService.getDevices(),
      adminService.getSystemHealthLogs(),
      checkSupabaseConnection(),
    ]);

    setDevices(devs);
    setHealthLogs(logs);
    setDbStatus(dbHealth);
    setIsRefreshing(false);
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'scanner':
        return <Scan className="w-5 h-5 text-emerald-600" />;
      case 'printer':
        return <Printer className="w-5 h-5 text-sky-600" />;
      case 'display':
        return <Tv className="w-5 h-5 text-purple-600" />;
      default:
        return <HardDrive className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
              Technical Infrastructure Console
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">IDH/NIID Systems Engineering</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Application Health & Display Connectivity</h1>
          <p className="text-xs text-slate-500">
            Monitor PostgreSQL database latency, Supabase Realtime channels, and waiting hall displays.
          </p>
        </div>

        <button
          onClick={checkHealth}
          disabled={isRefreshing}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Health Diagnostics</span>
        </button>
      </div>

      {/* Health Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="font-medium">Database Layer</span>
            <Server className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {dbStatus.connected ? 'Operational' : isSupabaseConfigured() ? 'Degraded' : 'Mock Mode'}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Latency: <strong>{dbStatus.latency} ms</strong></span>
            <span className={dbStatus.connected ? 'text-emerald-600 font-bold' : 'text-amber-600 font-medium'}>
              {dbStatus.connected ? 'Supabase Live' : 'Interactive Seed DB'}
            </span>
          </div>
        </div>

        {/* Realtime Engine */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="font-medium">Supabase Realtime</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'local_fallback' ? 'Active Local' : 'Standby'}
          </div>
          <div className="text-[11px] text-slate-500">
            Channel: <strong>hospital_queue_realtime</strong>
          </div>
        </div>

        {/* Displays Online */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="font-medium">Hall Displays</span>
            <Tv className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {devices.filter(d => d.device_type === 'display' && d.status === 'online').length} / {devices.filter(d => d.device_type === 'display').length}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">All displays synchronizing</div>
        </div>

        {/* Hardware Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="font-medium">Peripheral Hardware</span>
            <Cpu className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {devices.filter(d => d.status === 'online').length} / {devices.length} Devices
          </div>
          <div className="text-[11px] text-slate-500">Scanners & Thermal Printers</div>
        </div>
      </div>

      {/* Grid: Hardware & Display Connectivity & System Health Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device & Display Health Table */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Connected Hospital Devices & Displays</h3>
              <p className="text-xs text-slate-500">Measurable connectivity heartbeats and device interfaces</p>
            </div>
          </div>

          <div className="space-y-3">
            {devices.map((dev) => (
              <div key={dev.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                    {getDeviceIcon(dev.device_type)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{dev.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      ID: {dev.ip_or_identifier || 'USB-DEVICE'} • {dev.details?.model || 'Standard Interface'}
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <StatusBadge status={dev.status} type="device" />
                  <div className="text-[10px] text-slate-400">
                    Ping: {timeAgo(dev.last_ping) || 'Just now'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Diagnostics & Component Logs */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-base">System Component Logs</h3>
              <p className="text-xs text-slate-500">Latency measurements, transaction logs, and exceptions</p>
            </div>
            <Terminal className="w-5 h-5 text-slate-400" />
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto font-mono text-xs">
            {healthLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sky-400 font-bold uppercase">{log.component}</span>
                  <span className="text-slate-400">{timeAgo(log.created_at)}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <span>Status: <strong className="text-emerald-400">{log.status}</strong></span>
                  <span>•</span>
                  <span>Response: <strong className="text-amber-300">{log.response_time_ms}ms</strong></span>
                </div>
                {log.details && (
                  <div className="text-slate-500 text-[10px] truncate">
                    {JSON.stringify(log.details)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px] flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Security Boundary Active: Technical accounts have zero read permissions on patient clinical files and diagnoses.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
