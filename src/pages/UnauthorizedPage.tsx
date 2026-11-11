import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
        <ShieldAlert className="w-9 h-9" />
      </div>
      <h1 className="text-2xl font-bold text-white">403 - Access Denied</h1>
      <p className="text-xs text-slate-400 mt-2 max-w-sm">
        You do not possess the required server-side authorization role to access this hospital clinical resource.
      </p>
      <Link
        to="/"
        className="mt-6 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Authorized Dashboard</span>
      </Link>
    </div>
  );
};
