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
  UserCircle, 
  Wifi, 
  WifiOff, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, role, switchRole, logout } = useAuth();
  const { connectionStatus, lastPingMs } = useRealtime();
  const navigate = useNavigate();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    switchRole(newRole);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">IDH / NIID Hospital</span>
                <span className="text-[11px] bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded-full">G05 Queue</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Queue Management & Clinical Consultation System</p>
            </div>
          </Link>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Public Queue Display Link */}
          <Link
            to="/display"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
            title="Open Waiting Room Public Display Screen in New Tab"
          >
            <Tv className="w-4 h-4" />
            <span>Public Display Board</span>
          </Link>

          {/* Real-time Connection Indicator */}
          <div 
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded-full border bg-slate-50"
            title={
              connectionStatus === 'connected' 
                ? `Supabase Realtime Active (${lastPingMs}ms)` 
                : connectionStatus === 'local_fallback'
                ? 'Local Interactive Mode (Seed Storage Active)'
                : 'Connecting...'
            }
          >
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span className="hidden lg:inline text-slate-700 font-medium">Realtime Live</span>
                <span className="text-[11px] text-emerald-600 font-bold">{lastPingMs}ms</span>
              </>
            ) : connectionStatus === 'local_fallback' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden lg:inline text-slate-700 font-medium">Local Mock DB</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span className="hidden lg:inline text-slate-600">Connecting...</span>
              </>
            )}
          </div>

          {/* Quick Role Switcher (Crucial for test evaluation of all 6 roles) */}
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={role}
              onChange={handleRoleChange}
              className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1.5 cursor-pointer focus:ring-2 focus:ring-sky-500 focus:outline-none"
              title="Switch user role to test dashboards"
            >
              <option value="patient">Role: Patient</option>
              <option value="doctor">Role: Doctor</option>
              <option value="receptionist">Role: Receptionist</option>
              <option value="hospital_admin">Role: Hospital Admin</option>
              <option value="clinic_head">Role: Clinic Head</option>
              <option value="technical_maintainer">Role: Technical Maintainer</option>
            </select>
          </div>

          {/* Notifications Bell */}
          <NotificationDropdown />

          {/* User Profile Pill */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-900 truncate max-w-[130px]">
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
