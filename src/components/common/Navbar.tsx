import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { NotificationDropdown } from './NotificationDropdown';
import { UserRole } from '../../types/database';
import { getRoleBadgeColor } from '../../lib/utils';
import { 
  Activity, 
  Tv, 
  LogOut, 
  Wifi, 
  WifiOff, 
  Sparkles,
  ShieldCheck,
  Menu,
  X,
  LayoutDashboard,
  Ticket,
  Users,
  Calendar,
  FileText,
  Stethoscope,
  BarChart3,
  HardDrive,
  UserPlus,
  Building2,
  RefreshCw
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface NavbarProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) => {
  const { user, role, switchRole, logout } = useAuth();
  const { connectionStatus, lastPingMs } = useRealtime();
  const navigate = useNavigate();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    switchRole(newRole);
    // Reset tab to default for the selected role
    if (onTabChange) {
      if (newRole === 'patient') onTabChange('overview');
      else if (newRole === 'doctor') onTabChange('console');
      else if (newRole === 'receptionist') onTabChange('checkin');
      else if (newRole === 'hospital_admin') onTabChange('overview');
      else if (newRole === 'clinic_head') onTabChange('overview');
      else if (newRole === 'technical_maintainer') onTabChange('health');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Top nav tabs for the current role
  const getNavTabsForRole = () => {
    switch (role) {
      case 'patient':
        return [
          { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'token', label: 'My Token', icon: Ticket },
          { id: 'appointments', label: 'Appointments', icon: Calendar },
          { id: 'history', label: 'History', icon: FileText },
          { id: 'reports', label: 'Lab Reports', icon: BarChart3 },
        ];
      case 'doctor':
        return [
          { id: 'console', label: 'Doctor Console', icon: Stethoscope },
          { id: 'waiting_queue', label: 'Waiting Queue', icon: Users },
          { id: 'history', label: 'Patient Records', icon: FileText },
        ];
      case 'receptionist':
        return [
          { id: 'checkin', label: 'Check-in & Tokens', icon: Ticket },
          { id: 'register', label: 'Register Patient', icon: UserPlus },
          { id: 'queue_overview', label: 'Queue Overview', icon: LayoutDashboard },
        ];
      case 'hospital_admin':
        return [
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'staff', label: 'Staff Accounts', icon: Users },
          { id: 'clinics', label: 'Clinics & Rooms', icon: Building2 },
          { id: 'reports', label: 'Reports', icon: BarChart3 },
        ];
      case 'clinic_head':
        return [
          { id: 'overview', label: 'Performance', icon: LayoutDashboard },
          { id: 'doctor_queues', label: 'Doctor Stations', icon: Users },
          { id: 'waiting_times', label: 'Wait Analytics', icon: BarChart3 },
        ];
      case 'technical_maintainer':
        return [
          { id: 'health', label: 'System Health', icon: LayoutDashboard },
          { id: 'devices', label: 'Hardware', icon: HardDrive },
          { id: 'logs', label: 'Logs', icon: FileText },
        ];
      default:
        return [];
    }
  };

  const navTabs = getNavTabsForRole();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Left Section: Mobile Menu Toggle & Brand Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-2 md:hidden text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
              title="Toggle Menu"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base lg:text-lg">IDH / NIID</span>
                <span className="text-[10px] sm:text-[11px] bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded-full">G05 Queue</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 hidden xl:block">Queue Management System</p>
            </div>
          </Link>
        </div>

        {/* Center: Top Navigation Bar Buttons (Quick Tabs) */}
        {onTabChange && navTabs.length > 0 && (
          <nav className="hidden lg:flex items-center space-x-1 overflow-x-auto py-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Section: Actions & Utilities */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Public Queue Display Button */}
          <Link
            to="/display"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors shadow-xs"
            title="Open Waiting Room Public Display Screen in New Tab"
          >
            <Tv className="w-4 h-4 text-sky-600" />
            <span className="hidden sm:inline">Display Board</span>
          </Link>

          {/* Real-time Connection Indicator */}
          <div 
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded-full border bg-slate-50"
            title={
              connectionStatus === 'connected' 
                ? `Supabase Realtime Live (${lastPingMs}ms)` 
                : connectionStatus === 'local_fallback'
                ? 'Local Seed DB Interactive Mode'
                : 'Connecting...'
            }
          >
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span className="hidden xl:inline text-slate-700 font-medium">Realtime</span>
                <span className="text-[11px] text-emerald-600 font-bold">{lastPingMs}ms</span>
              </>
            ) : connectionStatus === 'local_fallback' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span className="text-slate-700 font-medium text-[11px]">Mock DB</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span className="text-slate-600 text-[11px]">Connecting</span>
              </>
            )}
          </div>

          {/* Role Switcher Dropdown */}
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={role}
              onChange={handleRoleChange}
              className="text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg px-2 sm:px-2.5 py-1.5 cursor-pointer focus:ring-2 focus:ring-sky-500 focus:outline-none max-w-[110px] sm:max-w-none"
              title="Switch user role to test dashboards"
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="hospital_admin">Admin</option>
              <option value="clinic_head">Clinic Head</option>
              <option value="technical_maintainer">Maintainer</option>
            </select>
          </div>

          {/* Notifications Bell */}
          <NotificationDropdown />

          {/* User Profile & Sign Out Button */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 pl-1.5 sm:pl-2 border-l border-slate-200">
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
                {user?.full_name || 'Guest User'}
              </div>
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.2 rounded-full border ${getRoleBadgeColor(role)}`}>
                {role.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
