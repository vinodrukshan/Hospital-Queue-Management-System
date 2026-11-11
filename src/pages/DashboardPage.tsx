import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { PatientDashboard } from '../components/dashboards/PatientDashboard';
import { DoctorDashboard } from '../components/dashboards/DoctorDashboard';
import { ReceptionistDashboard } from '../components/dashboards/ReceptionistDashboard';
import { HospitalAdminDashboard } from '../components/dashboards/HospitalAdminDashboard';
import { ClinicHeadDashboard } from '../components/dashboards/ClinicHeadDashboard';
import { TechnicalMaintainerDashboard } from '../components/dashboards/TechnicalMaintainerDashboard';

export const DashboardPage: React.FC = () => {
  const { role } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('overview');

  const renderDashboardByRole = () => {
    switch (role) {
      case 'patient':
        return <PatientDashboard activeTab={currentTab} />;
      case 'doctor':
        return <DoctorDashboard />;
      case 'receptionist':
        return <ReceptionistDashboard />;
      case 'hospital_admin':
        return <HospitalAdminDashboard />;
      case 'clinic_head':
        return <ClinicHeadDashboard />;
      case 'technical_maintainer':
        return <TechnicalMaintainerDashboard />;
      default:
        return <PatientDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
        <main className="flex-1 overflow-x-hidden">
          {renderDashboardByRole()}
        </main>
      </div>
    </div>
  );
};
