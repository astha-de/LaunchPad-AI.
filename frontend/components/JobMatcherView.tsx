import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  History,
  Loader2,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { JobMatch } from '../types/index.ts';

interface JobMatcherViewProps {
  sharedResumeText: string;
}

export function JobMatcherView({ sharedResumeText }: JobMatcherViewProps) {
  const [resumeText, setResumeText] = useState(sharedResumeText);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMatch, setCurrentMatch] = useState<JobMatch | null>(null);
  const [history, setHistory] = useState<JobMatch[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (sharedResumeText && !resumeText.trim()) {
      setResumeText(sharedResumeText);
    }
  }, [sharedResumeText]);

  useEffect(() => {
    let active = true;
    async function fetchHistory() {
      try {
        const { history: items } = await api.getMatchHistory();
        if (active) {
          setHistory(items);
          if (items.length > 0 && !currentMatch) {
            setCurrentMatch(items[0]);
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load match history.');
        }
      } finally {
        if (active) setLoadingHistory(false);
      }
    }
    void fetchHistory();
    return () => {
      active = false;
    };
  }, []);

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (resumeText.trim().length < 40) {
      setError('Please enter your resume text (at least 40 characters).');
      return;
    }

    if (jobDescription.trim().length < 40) {
      setError('Please paste the full job description (at least 40 characters).');
      return;
    }

    setMatching(true);
    try {
      const { match } = await api.matchJobDescription({
        resumeText: resumeText.trim(),
        jobDescription: jobDescription.trim(),
        jobTitle: jobTitle.trim() || undefined,
        companyName: companyName.trim() || undefined,
      });

      setCurrentMatch(match);
      setHistory((prev) => [match, ...prev.filter((item) => item.id !== match.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to match job description.');
    } finally {
      setMatching(false);
    }
  }

  const score = currentMatch?.matchScore ?? 0;
  const gaugeRadius = 46;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeDashOffset = gaugeCircumference - (score / 100) * gaugeCircumference;
  const scoreColor =
    score >= 75 ? '#16A34A' : score >= 50 ? '#0284C7' : '#D97706';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Comparison Form & History */}
      <div className="xl:col-span-5 space-y-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-display text-base font-semibold text-slate-900 mb-4">
            Compare Resume & Job Description
          </h2>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCompare} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="match-job-title" className="block text-xs font-medium text-slate-700 mb-1">
                  Job Role
                </label>
                <input
                  id="match-job-title"
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Backend Engineer"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                />
              </div>
              <div>
                <label htmlFor="match-company" className="block text-xs font-medium text-slate-700 mb-1">
                  Company <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="match-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Cloud"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="match-resume" className="text-xs font-medium text-slate-700">
                  Your Resume Text
                </label>
                {sharedResumeText && resumeText !== sharedResumeText && (
                  <button
                    type="button"
                    onClick={() => setResumeText(sharedResumeText)}
                    className="text-xs font-medium text-sky-700 hover:text-sky-900 cursor-pointer"
                  >
                    Use latest analyzed resume
                  </button>
                )}
              </div>
              <textarea
                id="match-resume"
                rows={6}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume text or analyze a PDF in Resume Analyzer first..."
                className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 resize-y"
              />
            </div>

            <div>
              <label htmlFor="match-jd" className="block text-xs font-medium text-slate-700 mb-1">
                Job Description
              </label>
              <textarea
                id="match-jd"
                rows={7}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job posting requirements, responsibilities, and preferred qualifications..."
                className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={matching}
              className="w-full py-2.5 px-4 bg-[#0B1F3A] hover:bg-[#122B4D] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {matching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Calculating Skill Match...</span>
                </>
              ) : (
                <span>Compare Skills & Score Fit</span>
              )}
            </button>
          </form>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Recent Job Comparisons
            </h3>
          </div>

          {loadingHistory ? (
            <div className="space-y-2">
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-500">
              Your job description match scores will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setCurrentMatch(item)}
                    className={`w-full py-2.5 px-3 rounded-lg text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      currentMatch?.id === item.id ? 'bg-sky-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.jobTitle}
                        {item.companyName ? ` · ${item.companyName}` : ''}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {item.missingSkills.length} missing skills ·{' '}
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums shrink-0">
                      {item.matchScore}%
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Right: Match Score & Gap Breakdown */}
      <div className="xl:col-span-7">
        {!currentMatch ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display text-base font-semibold text-slate-900">
              Ready to benchmark your resume
            </h3>
            <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
              Paste your resume and a job description to see an objective skill match score,
              aligned capabilities, and missing keywords to address before applying.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            {/* Score Hero */}
            <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-32 h-32 shrink-0">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r={gaugeRadius}
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="12"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={gaugeRadius}
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={gaugeCircumference}
                    strokeDashoffset={gaugeDashOffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-2xl font-bold text-slate-900 tabular-nums">
                    {currentMatch.matchScore}%
                  </span>
                  <span className="text-[11px] text-slate-500">Match Score</span>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  {currentMatch.jobTitle}
                  {currentMatch.companyName ? ` at ${currentMatch.companyName}` : ''}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {currentMatch.matchedSkills.length} matched skills ·{' '}
                  {currentMatch.missingSkills.length} missing skills
                </p>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">
                  {currentMatch.summary}
                </p>
              </div>
            </div>

            {/* Matched vs Missing Skills */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Matched Skills
                  </h3>
                </div>
                {currentMatch.matchedSkills.length === 0 ? (
                  <p className="text-xs text-slate-500">No direct overlaps identified.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentMatch.matchedSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-md"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Missing / Unverified Skills
                  </h3>
                </div>
                {currentMatch.missingSkills.length === 0 ? (
                  <p className="text-xs text-slate-500">All major required skills covered.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentMatch.missingSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-900 border border-red-200 rounded-md"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tailoring Recommendations */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Tailoring Recommendations
                </h3>
              </div>
              <ol className="space-y-2.5 list-decimal list-inside text-sm text-slate-700">
                {currentMatch.recommendations.map((rec, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {rec}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
