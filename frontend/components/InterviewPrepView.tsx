import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  History,
  Loader2,
  MessageSquareText,
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { InterviewPrep } from '../types/index.ts';

interface InterviewPrepViewProps {
  sharedResumeText: string;
}

export function InterviewPrepView({ sharedResumeText }: InterviewPrepViewProps) {
  const [jobRole, setJobRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Mid-Level');
  const [focusArea, setFocusArea] = useState('');
  const [useResumeContext, setUseResumeContext] = useState(Boolean(sharedResumeText));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrep, setCurrentPrep] = useState<InterviewPrep | null>(null);
  const [history, setHistory] = useState<InterviewPrep[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Technical' | 'HR'>('All');
  const [practiceMode, setPracticeMode] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let active = true;
    async function fetchHistory() {
      try {
        const { history: items } = await api.getInterviewHistory();
        if (active) {
          setHistory(items);
          if (items.length > 0 && !currentPrep) {
            setCurrentPrep(items[0]);
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load saved interview prep.');
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

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (jobRole.trim().length < 2) {
      setError('Please enter a target job role.');
      return;
    }

    setGenerating(true);
    try {
      const { prep } = await api.generateInterviewPrep({
        jobRole: jobRole.trim(),
        experienceLevel,
        focusArea: focusArea.trim() || undefined,
        resumeText: useResumeContext && sharedResumeText ? sharedResumeText : undefined,
      });

      setCurrentPrep(prep);
      setRevealedIndices({});
      setCategoryFilter('All');
      setHistory((prev) => [prep, ...prev.filter((item) => item.id !== prep.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate interview questions.');
    } finally {
      setGenerating(false);
    }
  }

  function toggleReveal(idx: number) {
    setRevealedIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  const indexedQuestions = (currentPrep?.questions || [])
    .map((question, originalIndex) => ({ question, originalIndex }))
    .filter(({ question }) =>
      categoryFilter === 'All' ? true : question.category === categoryFilter
    );

  const techCount = (currentPrep?.questions || []).filter((q) => q.category === 'Technical').length;
  const hrCount = (currentPrep?.questions || []).filter((q) => q.category === 'HR').length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Generator Form & Saved Prep Sets */}
      <div className="xl:col-span-4 space-y-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-display text-base font-semibold text-slate-900 mb-4">
            Generate Interview Question Set
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

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label htmlFor="prep-role" className="block text-xs font-medium text-slate-700 mb-1">
                Target Job Role
              </label>
              <input
                id="prep-role"
                type="text"
                required
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="Full-Stack React & Node.js Developer"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
              />
            </div>

            <div>
              <label htmlFor="prep-level" className="block text-xs font-medium text-slate-700 mb-1">
                Experience Level
              </label>
              <select
                id="prep-level"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
              >
                <option value="Entry / Junior">Entry / Junior</option>
                <option value="Mid-Level">Mid-Level</option>
                <option value="Senior">Senior</option>
                <option value="Lead / Staff">Lead / Staff</option>
              </select>
            </div>

            <div>
              <label htmlFor="prep-focus" className="block text-xs font-medium text-slate-700 mb-1">
                Focus Area <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="prep-focus"
                type="text"
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                placeholder="System design, REST APIs, leadership"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
              />
            </div>

            {sharedResumeText && (
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useResumeContext}
                  onChange={(e) => setUseResumeContext(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  Tailor questions to my latest analyzed resume
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={generating}
              className="w-full py-2.5 px-4 bg-[#0B1F3A] hover:bg-[#122B4D] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Questions...</span>
                </>
              ) : (
                <span>Generate Technical & HR Q&A</span>
              )}
            </button>
          </form>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Saved Prep Sets
            </h3>
          </div>

          {loadingHistory ? (
            <div className="space-y-2">
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-500">
              Generated interview question sets will be saved here.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPrep(item);
                      setRevealedIndices({});
                    }}
                    className={`w-full py-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer ${
                      currentPrep?.id === item.id ? 'bg-sky-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {item.jobRole}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {item.experienceLevel} · {item.questions.length} questions ·{' '}
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Right: Technical & HR Questions */}
      <div className="xl:col-span-8">
        {!currentPrep ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <MessageSquareText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display text-base font-semibold text-slate-900">
              No interview prep generated yet
            </h3>
            <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
              Enter your target job role and seniority level on the left to generate categorized
              Technical and HR interview questions with suggested answers.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  {currentPrep.jobRole}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {currentPrep.experienceLevel}
                  {currentPrep.focusArea ? ` · ${currentPrep.focusArea}` : ''} ·{' '}
                  {techCount} Technical · {hrCount} HR
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex p-1 bg-slate-100 rounded-lg">
                  {(['All', 'Technical', 'HR'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setCategoryFilter(tab)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        categoryFilter === tab
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPracticeMode((prev) => !prev);
                    setRevealedIndices({});
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    practiceMode
                      ? 'bg-sky-50 border-sky-300 text-sky-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {practiceMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{practiceMode ? 'Practice Mode On' : 'Practice Mode'}</span>
                </button>
              </div>
            </div>

            {/* Question List */}
            <div className="space-y-3">
              {indexedQuestions.map(({ question: item, originalIndex }, displayIdx) => {
                const isAnswerVisible = !practiceMode || Boolean(revealedIndices[originalIndex]);
                const isTech = item.category === 'Technical';
                return (
                  <article
                    key={`${currentPrep.id}-${originalIndex}`}
                    className="bg-white border border-slate-200 rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`px-2 py-0.5 font-medium rounded-md border ${
                              isTech
                                ? 'bg-sky-50 text-sky-900 border-sky-200'
                                : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}
                          >
                            {item.category}
                          </span>
                          <span className="text-slate-400 tabular-nums">
                            Question {displayIdx + 1}
                          </span>
                        </div>
                        <h3 className="font-display text-base font-semibold text-slate-900 leading-snug">
                          {item.question}
                        </h3>
                      </div>

                      {practiceMode && (
                        <button
                          type="button"
                          onClick={() => toggleReveal(originalIndex)}
                          className="px-3 py-1.5 text-xs font-medium text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 rounded-lg inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>{isAnswerVisible ? 'Hide Answer' : 'Reveal Answer'}</span>
                          {isAnswerVisible ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {isAnswerVisible && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">
                            Suggested Answer
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {item.suggestedAnswer}
                          </p>
                        </div>

                        {item.keyPoints.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1.5">
                              Key Points to Hit
                            </p>
                            <ul className="space-y-1 text-xs text-slate-600">
                              {item.keyPoints.map((pt, pIdx) => (
                                <li key={pIdx} className="flex gap-2">
                                  <span className="text-sky-600 font-semibold">·</span>
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
