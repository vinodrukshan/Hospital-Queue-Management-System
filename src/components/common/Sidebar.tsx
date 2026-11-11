import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Calendar, 
  FileText, 
  Stethoscope, 
  BarChart3, 
  Settings, 
  HardDrive, 
  UserPlus, 
  ShieldAlert,
  Building2,
  Tv,
  Bell
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { role } = useAuth();
  const location = useLocation();

  // Navigation items specific to each role
  const getNavItems = () => {
    switch (role) {
      case 'patient':
        return [
          { id: 'overview', label: 'My Dashboard', icon: LayoutDashboard },
          { id: 'token', label: 'My Live Token', icon: Ticket },
          { id: 'appointments', label: 'Appointments', icon: Calendar },
          { id: 'history', label: 'Medical History', icon: FileText },
          { id: 'reports', label: 'Laboratory Reports', icon: BarChart3 },
        ];
      case 'doctor':
        return [
          { id: 'console', label: 'Doctor Console', icon: Stethoscope },
          { id: 'waiting_queue', label: 'Waiting Queue', icon: Users },
          { id: 'appointments', label: "Today's Schedule", icon: Calendar },
          { id: 'history', label: 'Patient Medical Records', icon: FileText },
        ];
      case 'receptionist':
        return [
          { id: 'checkin', label: 'Patient Check-in & Tokens', icon: Ticket },
          { id: 'register', label: 'Register New Patient', icon: UserPlus },
          { id: 'search', label: 'Patient Directory', icon: Users },
          { id: 'queue_overview', label: 'Hospital Queue Overview', icon: LayoutDashboard },
        ];
      case 'hospital_admin':
        return [
          { id: 'overview', label: 'Hospital Overview', icon: LayoutDashboard },
          { id: 'staff', label: 'Staff Management', icon: Users },
          { id: 'clinics', label: 'Clinics & Counters', icon: Building2 },
          { id: 'reports', label: 'Operational Analytics', icon: BarChart3 },
        ];
      case 'clinic_head':
        return [
          { id: 'overview', label: 'Clinic Performance', icon: LayoutDashboard },
          { id: 'doctor_queues', label: 'Doctor-wise Queues', icon: Users },
          { id: 'waiting_times', label: 'Waiting Time Analytics', icon: BarChart3 },
          { id: 'alerts', label: 'Operational Alerts', icon: ShieldAlert },
        ];
      case 'technical_maintainer':
        return [
          { id: 'health', label: 'System Health', icon: LayoutDashboard },
          { id: 'devices', label: 'Hardware & Displays', icon: HardDrive },
          { id: 'logs', label: 'Error & Audit Logs', icon: FileText },
          { id: 'maintenance', label: 'Maintenance Tasks', icon: Settings },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 shrink-0 md:min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        {/* Navigation list */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Navigation Menu
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-bold shadow-xs border border-sky-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Tools */}
        <div className="pt-4 border-t border-slate-100">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Live Interfaces
          </div>
          <div className="space-y-1">
            <Link
              to="/display"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 px-3 py-2 text-xs font-medium text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-xl transition-colors"
            >
              <Tv className="w-4 h-4 text-sky-500" />
              <span>Public Queue Display</span>
            </Link>
            <Link
              to="/notifications"
              className="flex items-center space-x-3 px-3 py-2 text-xs font-medium text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-xl transition-colors"
            >
              <Bell className="w-4 h-4 text-amber-500" />
              <span>Notification Center</span>
            </Link>
          </div>
        </div>

        {/* System Info Box */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
          <div className="font-semibold text-slate-700">Project G05 NIID Clinics</div>
          <div>Version: 1.0.0 Production Ready</div>
          <div className="text-[10px] text-slate-400">PostgreSQL • Supabase Realtime</div>
        </div>
      </div>
    </aside>
  );
};
