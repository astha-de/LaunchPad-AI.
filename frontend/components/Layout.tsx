import React, { useState } from 'react';
import {
  Briefcase,
  FileSearch,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Plus,
  Rocket,
  Target,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { NavSection } from '../types/index.ts';

interface LayoutProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  onQuickAddApplication: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'resume', label: 'Resume Analyzer', icon: FileSearch },
  { id: 'matcher', label: 'JD Matcher', icon: Target },
  { id: 'interview', label: 'Interview Prep', icon: MessageSquareText },
  { id: 'tracker', label: 'Application Tracker', icon: Briefcase },
];

const SECTION_META: Record<NavSection, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Career Overview',
    subtitle: 'Application pipeline, response metrics, and recent workspace activity',
  },
  resume: {
    title: 'AI Resume Analyzer',
    subtitle: 'Upload a PDF or paste text for skill extraction and actionable feedback',
  },
  matcher: {
    title: 'Job Description Matcher',
    subtitle: 'Compare your resume against target roles to identify skill gaps',
  },
  interview: {
    title: 'AI Interview Preparation',
    subtitle: 'Generate tailored Technical and HR questions with model answers',
  },
  tracker: {
    title: 'Application Tracker',
    subtitle: 'Manage submissions across Applied, Interview, Selected, and Rejected stages',
  },
};

export function Layout({
  activeSection,
  onNavigate,
  onQuickAddApplication,
  children,
}: LayoutProps) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const meta = SECTION_META[activeSection];

  function handleSelectSection(id: NavSection) {
    onNavigate(id);
    setMobileMenuOpen(false);
  }

  const initials = (user?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#0B1F3A] text-white border-r border-[#122B4D]">
        <div className="h-16 px-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
            <Rocket className="w-4 h-4" />
          </div>
          <span className="font-display text-base font-bold tracking-tight whitespace-nowrap">
            LaunchPad AI
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Workspace navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSection(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-300 hover:bg-[#122B4D] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-xs font-semibold text-sky-200 shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">
                {user?.targetRole || user?.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-2 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-[#122B4D] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#0B1F3A] text-white flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
                  <Rocket className="w-4 h-4" />
                </div>
                <span className="font-display text-base font-bold tracking-tight whitespace-nowrap">
                  LaunchPad AI
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-5 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                      isActive
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-300 hover:bg-[#122B4D] hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-white/10">
              <p className="text-sm font-medium text-white truncate px-2">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate px-2 mb-3">{user?.email}</p>
              <button
                type="button"
                onClick={() => void logout()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-[#122B4D] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Workspace</span>
                <span aria-hidden="true">/</span>
                <span className="text-slate-700 font-medium truncate">{meta.title}</span>
              </div>
              <p className="hidden sm:block text-xs text-slate-500 truncate mt-0.5">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onQuickAddApplication}
              className="px-3.5 py-2 bg-[#0B1F3A] hover:bg-[#122B4D] text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Application</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
