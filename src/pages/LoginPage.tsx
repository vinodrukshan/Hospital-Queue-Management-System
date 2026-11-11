import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types/database';
import { 
  Activity, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  User, 
  Stethoscope, 
  Ticket, 
  Building2, 
  Settings,
  Sparkles
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('doctor@idh.hospital.lk');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const success = await login(email);
    if (success) {
      navigate('/');
    } else {
      setErrorMessage('Invalid credentials or inactive account. Please check your credentials or contact Hospital Admin.');
    }
  };

  const handleQuickLogin = async (targetRole: UserRole, targetEmail: string) => {
    setEmail(targetEmail);
    const success = await login(targetEmail, targetRole);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white mx-auto shadow-xl">
          <Activity className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-white tracking-tight">IDH / NIID Hospital</h2>
        <p className="mt-1 text-xs text-sky-200">
          Project G05: Hospital Queue Management & Clinical Consultation Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-slate-200">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {isForgotPassword ? (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Hospital Access Recovery</h3>
              <p className="text-xs text-slate-500">
                Enter your registered hospital email to request administrative password reset instructions.
              </p>
              {recoverySent ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium">
                  Recovery request sent! If this email exists, instructions have been dispatched.
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setRecoverySent(true);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-sky-600 text-white rounded-xl text-xs font-bold shadow"
                  >
                    Send Recovery Email
                  </button>
                </form>
              )}
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setRecoverySent(false);
                }}
                className="text-xs text-sky-600 hover:text-sky-800 font-bold block text-center w-full pt-2"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Hospital Account Email</label>
                <div className="mt-1 relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="staff@idh.hospital.lk"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="mt-1 relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md transition-colors"
              >
                <span>Sign In to Hospital Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Demo Switcher Section for Evaluation of All 6 Roles */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Role Quick-Login (Evaluation Demo):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickLogin('patient', 'patient@idh.hospital.lk')}
                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>1. Patient</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('doctor', 'doctor@idh.hospital.lk')}
                className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-900 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                <span>2. Doctor</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('receptionist', 'reception@idh.hospital.lk')}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. Receptionist</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('hospital_admin', 'admin@idh.hospital.lk')}
                className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>4. Hospital Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('clinic_head', 'clinichead@idh.hospital.lk')}
                className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>5. Clinic Head</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('technical_maintainer', 'maintainer@idh.hospital.lk')}
                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-amber-600" />
                <span>6. Maintainer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
