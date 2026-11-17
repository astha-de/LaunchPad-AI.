import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  FileUp,
  History,
  Lightbulb,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { ResumeAnalysis } from '../types/index.ts';

interface ResumeAnalyzerViewProps {
  onResumeReady: (resumeText: string) => void;
  onSendToMatcher: (resumeText: string) => void;
}

export function ResumeAnalyzerView({
  onResumeReady,
  onSendToMatcher,
}: ResumeAnalyzerViewProps) {
  const [inputMode, setInputMode] = useState<'pdf' | 'text'>('pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<ResumeAnalysis | null>(null);
  const [history, setHistory] = useState<ResumeAnalysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchHistory() {
      try {
        const { history: items } = await api.getResumeHistory();
        if (active) {
          setHistory(items);
          if (items.length > 0 && !currentAnalysis) {
            setCurrentAnalysis(items[0]);
            if (items[0].resumeText) {
              onResumeReady(items[0].resumeText);
            }
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load resume history.');
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

  function validateAndSelectFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Only PDF files (.pdf) are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('PDF file must be 5 MB or smaller.');
      return;
    }
    setSelectedFile(file);
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (inputMode === 'pdf' && !selectedFile) {
      setError('Please select a PDF resume file to analyze.');
      return;
    }

    if (inputMode === 'text' && resumeText.trim().length < 40) {
      setError('Please paste at least 40 characters of resume text.');
      return;
    }

    setAnalyzing(true);
    try {
      const { analysis } =
        inputMode === 'pdf' && selectedFile
          ? await api.analyzeResumeFile(selectedFile)
          : await api.analyzeResumeText(resumeText.trim());

      setCurrentAnalysis(analysis);
      setHistory((prev) => [analysis, ...prev.filter((item) => item.id !== analysis.id)]);
      if (analysis.resumeText) {
        onResumeReady(analysis.resumeText);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze resume.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left Column: Input Form & History */}
      <div className="xl:col-span-5 space-y-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Submit Resume for Review
            </h2>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-lg mb-5">
            <button
              type="button"
              onClick={() => {
                setInputMode('pdf');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                inputMode === 'pdf'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload PDF Resume
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('text');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                inputMode === 'text'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paste Resume Text
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAnalyze} className="space-y-4">
            {inputMode === 'pdf' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => validateAndSelectFile(e.target.files?.[0])}
                  className="hidden"
                />
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    validateAndSelectFile(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? 'border-sky-500 bg-sky-50/70'
                      : selectedFile
                      ? 'border-sky-300 bg-sky-50/40'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <FileUp className="w-8 h-8 text-sky-700 mx-auto mb-3" />
                  {selectedFile ? (
                    <>
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-xs mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 tabular-nums">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Click to replace PDF
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-800">
                        Drop your PDF resume here, or click to browse
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Supports standard PDF files up to 5 MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="resume-text-input" className="text-xs font-medium text-slate-700">
                    Resume Content
                  </label>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {resumeText.length} characters
                  </span>
                </div>
                <textarea
                  id="resume-text-input"
                  rows={11}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your full resume text (experience, education, technical skills, projects)..."
                  className="w-full p-3.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 resize-y"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={analyzing}
              className="w-full py-2.5 px-4 bg-[#0B1F3A] hover:bg-[#122B4D] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing with Gemini AI...</span>
                </>
              ) : (
                <span>Analyze Resume</span>
              )}
            </button>
          </form>
        </section>

        {/* Saved History */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Previous Analyses
            </h3>
          </div>

          {loadingHistory ? (
            <div className="space-y-2">
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-500">
              Your analyzed resumes will be saved here for quick access.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.map((item) => {
                const isSelected = currentAnalysis?.id === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentAnalysis(item);
                        if (item.resumeText) onResumeReady(item.resumeText);
                      }}
                      className={`w-full py-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.fileName}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <span className="tabular-nums">{item.skills.length} skills</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {new Date(item.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Right Column: Analysis Results */}
      <div className="xl:col-span-7">
        {!currentAnalysis ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display text-base font-semibold text-slate-900">
              No resume analyzed yet
            </h3>
            <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
              Upload a PDF resume or paste your text on the left to extract skills, evaluate
              strengths and weaknesses, and get actionable improvement suggestions.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            {/* Header & Summary */}
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900">
                    {currentAnalysis.fileName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    Analyzed{' '}
                    {new Date(currentAnalysis.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    · {currentAnalysis.skills.length} skills identified
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSendToMatcher(currentAnalysis.resumeText)}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <span>Match Against a Job</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="mt-4 text-sm text-slate-700 leading-relaxed">
                {currentAnalysis.candidateSummary}
              </p>
            </div>

            {/* Extracted Skills */}
            <div className="p-6">
              <h3 className="font-display text-sm font-semibold text-slate-900 mb-3">
                Extracted Skills
              </h3>
              {currentAnalysis.skills.length === 0 ? (
                <p className="text-xs text-slate-500">No explicit skills listed.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentAnalysis.skills.map((skill, idx) => (
                    <span
                      key={`${skill}-${idx}`}
                      className="px-2.5 py-1 text-xs font-medium bg-sky-50 text-sky-900 border border-sky-200 rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Strengths & Weaknesses */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Key Strengths
                  </h3>
                </div>
                <ul className="space-y-2.5">
                  {currentAnalysis.strengths.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-700 leading-relaxed flex gap-2">
                      <span className="text-emerald-600 font-semibold">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Weaknesses & Gaps
                  </h3>
                </div>
                <ul className="space-y-2.5">
                  {currentAnalysis.weaknesses.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-700 leading-relaxed flex gap-2">
                      <span className="text-amber-600 font-semibold">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Improvement Suggestions */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-sky-600 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Recommended Improvements
                </h3>
              </div>
              <ol className="space-y-2.5 list-decimal list-inside text-sm text-slate-700">
                {currentAnalysis.improvements.map((tip, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {tip}
                  </li>
                ))}
              </ol>
            </div>

            {/* ATS Readiness */}
            {currentAnalysis.atsReadinessNotes.length > 0 && (
              <div className="p-6 bg-slate-50/70 rounded-b-xl">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-[#0B1F3A] shrink-0" />
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    ATS Formatting & Keyword Notes
                  </h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  {currentAnalysis.atsReadinessNotes.map((note, idx) => (
                    <li key={idx} className="leading-relaxed flex gap-2">
                      <span className="text-slate-400 font-semibold">·</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
