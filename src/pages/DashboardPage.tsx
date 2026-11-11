import React, { useState, useEffect } from 'react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // When role changes, set sensible default tab
  useEffect(() => {
    switch (role) {
      case 'patient':
        setCurrentTab('overview');
        break;
      case 'doctor':
        setCurrentTab('console');
        break;
      case 'receptionist':
        setCurrentTab('checkin');
        break;
      case 'hospital_admin':
        setCurrentTab('overview');
        break;
      case 'clinic_head':
        setCurrentTab('overview');
        break;
      case 'technical_maintainer':
        setCurrentTab('health');
        break;
      default:
        setCurrentTab('overview');
    }
  }, [role]);

  const renderDashboardByRole = () => {
    switch (role) {
      case 'patient':
        return <PatientDashboard activeTab={currentTab} />;
      case 'doctor':
        return <DoctorDashboard activeTab={currentTab} onTabChange={setCurrentTab} />;
      case 'receptionist':
        return <ReceptionistDashboard activeTab={currentTab} onTabChange={setCurrentTab} />;
      case 'hospital_admin':
        return <HospitalAdminDashboard activeTab={currentTab} onTabChange={setCurrentTab} />;
      case 'clinic_head':
        return <ClinicHeadDashboard activeTab={currentTab} onTabChange={setCurrentTab} />;
      case 'technical_maintainer':
        return <TechnicalMaintainerDashboard activeTab={currentTab} onTabChange={setCurrentTab} />;
      default:
        return <PatientDashboard activeTab={currentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      <div className="flex-1 flex flex-col md:flex-row relative">
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 overflow-x-hidden min-w-0">
          {renderDashboardByRole()}
        </main>
      </div>
    </div>
  );
};
