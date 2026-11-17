import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ApplicationTrackerView } from './components/ApplicationTrackerView.tsx';
import { AuthView } from './components/AuthView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { InterviewPrepView } from './components/InterviewPrepView.tsx';
import { JobMatcherView } from './components/JobMatcherView.tsx';
import { Layout } from './components/Layout.tsx';
import { ResumeAnalyzerView } from './components/ResumeAnalyzerView.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import type { ApplicationStatus, NavSection } from './types/index.ts';

function WorkspaceApp() {
  const { user, loading } = useAuth();
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [trackerStatusFilter, setTrackerStatusFilter] = useState<ApplicationStatus | 'All'>('All');
  const [openNewAppModalSignal, setOpenNewAppModalSignal] = useState(0);
  const [sharedResumeText, setSharedResumeText] = useState('');
  const [dashboardRefreshTrigger, setDashboardRefreshTrigger] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 text-[#0B1F3A] animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading LaunchPad AI workspace...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  function handleNavigate(section: NavSection, statusFilter?: ApplicationStatus | 'All') {
    if (statusFilter) {
      setTrackerStatusFilter(statusFilter);
    }
    setActiveSection(section);
  }

  function handleQuickAddApplication() {
    setTrackerStatusFilter('All');
    setActiveSection('tracker');
    setOpenNewAppModalSignal((prev) => prev + 1);
  }

  return (
    <Layout
      activeSection={activeSection}
      onNavigate={(section) => handleNavigate(section)}
      onQuickAddApplication={handleQuickAddApplication}
    >
      {activeSection === 'dashboard' && (
        <DashboardView
          onNavigate={handleNavigate}
          onQuickAddApplication={handleQuickAddApplication}
          refreshTrigger={dashboardRefreshTrigger}
        />
      )}

      {activeSection === 'resume' && (
        <ResumeAnalyzerView
          onResumeReady={(text) => setSharedResumeText(text)}
          onSendToMatcher={(text) => {
            setSharedResumeText(text);
            setActiveSection('matcher');
          }}
        />
      )}

      {activeSection === 'matcher' && (
        <JobMatcherView sharedResumeText={sharedResumeText} />
      )}

      {activeSection === 'interview' && (
        <InterviewPrepView sharedResumeText={sharedResumeText} />
      )}

      {activeSection === 'tracker' && (
        <ApplicationTrackerView
          initialStatusFilter={trackerStatusFilter}
          openNewModalSignal={openNewAppModalSignal}
          onDataChanged={() => setDashboardRefreshTrigger((prev) => prev + 1)}
        />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceApp />
    </AuthProvider>
  );
}
