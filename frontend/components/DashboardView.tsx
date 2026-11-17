import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  FileSearch,
  Plus,
  Target,
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { ApplicationStatus, DashboardSummary, NavSection } from '../types/index.ts';

interface DashboardViewProps {
  onNavigate: (section: NavSection, statusFilter?: ApplicationStatus | 'All') => void;
  onQuickAddApplication: () => void;
  refreshTrigger: number;
}

const STATUS_STYLE: Record<
  ApplicationStatus,
  { color: string; bg: string; text: string; border: string }
> = {
  Applied: {
    color: '#0284C7',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
  },
  Interview: {
    color: '#D97706',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  Selected: {
    color: '#16A34A',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  Rejected: {
    color: '#DC2626',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
  },
};

export function DashboardView({
  onNavigate,
  onQuickAddApplication,
  refreshTrigger,
}: DashboardViewProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getDashboardSummary();
        if (active) setSummary(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard summary.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 bg-white border border-red-200 rounded-xl text-red-800 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
        <div>
          <h3 className="font-semibold text-sm">Unable to load dashboard</h3>
          <p className="text-sm text-red-700 mt-1">{error || 'Unexpected error.'}</p>
        </div>
      </div>
    );
  }

  const { stats, statusBreakdown, weeklyTrend, recentApplications, recentActivities } = summary;
  const totalForChart = statusBreakdown.reduce((sum, item) => sum + item.count, 0);
  const maxWeekly = Math.max(...weeklyTrend.map((w) => w.count), 1);

  // Donut chart stroke segments
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let cumulativeFraction = 0;

  return (
    <div className="space-y-6">
      {/* Top 4-column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Applications</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-slate-900 tabular-nums">
            {stats.totalApplications}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {stats.appliedCount} awaiting response
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Interview Invitations</span>
            <CalendarCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-slate-900 tabular-nums">
            {stats.interviewInvitations}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {stats.totalApplications > 0
              ? `${Math.round((stats.interviewInvitations / stats.totalApplications) * 100)}% conversion rate`
              : 'Add applications to track rate'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Selected / Offers</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-slate-900 tabular-nums">
            {stats.selectedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {stats.interviewSetsCount} interview prep sets saved
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Avg JD Match Score</span>
            <Target className="w-4 h-4 text-sky-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-slate-900 tabular-nums">
            {stats.avgMatchScore !== null ? `${stats.avgMatchScore}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.avgMatchScore !== null
              ? 'Across saved job comparisons'
              : 'Run JD Matcher to score fit'}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Donut Chart */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Application Status Breakdown
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any stage to filter your application tracker
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('tracker', 'All')}
              className="text-xs font-medium text-sky-700 hover:text-sky-900 flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>View Tracker</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative w-40 h-40 shrink-0">
              <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth="16"
                />
                {totalForChart > 0 &&
                  statusBreakdown.map((item) => {
                    if (item.count === 0) return null;
                    const fraction = item.count / totalForChart;
                    const dashLength = fraction * circumference;
                    const dashOffset = -cumulativeFraction * circumference;
                    cumulativeFraction += fraction;
                    return (
                      <circle
                        key={item.status}
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="none"
                        stroke={STATUS_STYLE[item.status].color}
                        strokeWidth="16"
                        strokeDasharray={`${dashLength} ${circumference}`}
                        strokeDashoffset={dashOffset}
                        className="transition-all duration-300"
                      />
                    );
                  })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-semibold text-slate-900 tabular-nums">
                  {totalForChart}
                </span>
                <span className="text-xs text-slate-500">Total</span>
              </div>
            </div>

            <div className="flex-1 w-full divide-y divide-slate-100">
              {statusBreakdown.map((item) => {
                const pct =
                  totalForChart > 0 ? Math.round((item.count / totalForChart) * 100) : 0;
                return (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() => onNavigate('tracker', item.status)}
                    className="w-full py-2.5 flex items-center justify-between text-left hover:bg-slate-50 px-2 rounded-md transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: STATUS_STYLE[item.status].color }}
                      />
                      <span className="text-sm font-medium text-slate-700">{item.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm tabular-nums">
                      <span className="font-semibold text-slate-900">{item.count}</span>
                      <span className="text-xs text-slate-400 w-9 text-right">{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Weekly Application Activity Bar Chart */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                6-Week Application Activity
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Applications submitted per 7-day window
              </p>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              {weeklyTrend.reduce((a, b) => a + b.count, 0)} in last 6 weeks
            </span>
          </div>

          <div className="h-44 flex items-end gap-3 pt-4">
            {weeklyTrend.map((week, idx) => {
              const heightPct = Math.max((week.count / maxWeekly) * 100, week.count > 0 ? 12 : 4);
              const isHovered = hoveredWeek === idx;
              return (
                <div
                  key={week.label}
                  onMouseEnter={() => setHoveredWeek(idx)}
                  onMouseLeave={() => setHoveredWeek(null)}
                  className="flex-1 flex flex-col items-center h-full justify-end group"
                >
                  <span
                    className={`text-xs font-mono tabular-nums mb-1.5 transition-opacity ${
                      isHovered || week.count > 0 ? 'opacity-100 text-slate-700' : 'opacity-0'
                    }`}
                  >
                    {week.count}
                  </span>
                  <div className="w-full max-w-[44px] h-28 flex items-end">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-md transition-colors ${
                        week.count === 0
                          ? 'bg-slate-100'
                          : isHovered
                          ? 'bg-sky-600'
                          : 'bg-[#0B1F3A]'
                      }`}
                    />
                  </div>
                  <span className="mt-2 text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                    {week.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Bottom Row: Recent Applications + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Applications */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Recent Applications
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('tracker', 'All')}
              className="text-xs font-medium text-sky-700 hover:text-sky-900 cursor-pointer"
            >
              Manage all
            </button>
          </div>

          {recentApplications.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-slate-200 rounded-lg">
              <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2.5" />
              <p className="text-sm font-medium text-slate-700">No applications logged yet</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Start tracking companies, interview rounds, and outcomes in one place.
              </p>
              <button
                type="button"
                onClick={onQuickAddApplication}
                className="px-3.5 py-2 bg-[#0B1F3A] hover:bg-[#122B4D] text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log First Application</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-2.5 pr-4">Company</th>
                    <th className="py-2.5 pr-4">Role</th>
                    <th className="py-2.5 pr-4">Applied</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {recentApplications.map((app) => {
                    const st = STATUS_STYLE[app.status];
                    return (
                      <tr key={app.id} className="hover:bg-slate-50/80">
                        <td className="py-3 pr-4 font-medium text-slate-900">{app.company}</td>
                        <td className="py-3 pr-4 text-slate-600">{app.role}</td>
                        <td className="py-3 pr-4 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                          {new Date(app.appliedDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded-md border ${st.bg} ${st.text} ${st.border}`}
                          >
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent Activities & Quick AI Launchers */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 mb-4">
              Recent Activities
            </h2>

            {recentActivities.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg">
                <FileSearch className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">No recent activity yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Analyze a resume or add an application to see your timeline.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentActivities.slice(0, 6).map((act) => (
                  <li key={act.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium text-slate-800">{act.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      {act.detail && <span>{act.detail}</span>}
                      {act.detail && <span aria-hidden="true">·</span>}
                      <span className="tabular-nums">
                        {new Date(act.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onNavigate('resume')}
              className="px-3 py-2.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-left transition-colors cursor-pointer"
            >
              <p className="text-xs font-semibold text-slate-900">Analyze Resume</p>
              <p className="text-[11px] text-slate-500 mt-0.5">PDF or text review</p>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('interview')}
              className="px-3 py-2.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-left transition-colors cursor-pointer"
            >
              <p className="text-xs font-semibold text-slate-900">Practice Interview</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Technical & HR Q&A</p>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
