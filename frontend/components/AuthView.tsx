import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  Rocket,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

const WORKSPACE_IMAGE = '/src/assets/images/auth_career_workspace_1794915041806.jpg';

export function AuthView() {
  const { login, signup, health, reconnectDatabase, refreshHealth } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [retryingDb, setRetryingDb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  async function handleRetryDb() {
    setRetryingDb(true);
    try {
      await reconnectDatabase();
    } finally {
      setRetryingDb(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please fill in your email and password.');
      return;
    }

    if (mode === 'signup') {
      if (name.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(trimmedEmail, password);
      } else {
        await signup({
          name: name.trim(),
          email: trimmedEmail,
          password,
          targetRole: targetRole.trim(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
      void refreshHealth();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Brand & Editorial Showcase Panel */}
      <div className="lg:w-1/2 bg-[#0B1F3A] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
              <Rocket className="w-5 h-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
              LaunchPad AI
            </span>
          </div>

          <div className="mt-12 max-w-lg">
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-tight [text-wrap:balance]">
              Prepare sharper resumes, match real roles, and track every interview.
            </h1>
            <p className="mt-4 text-slate-300 text-base leading-relaxed">
              An integrated job preparation workspace connecting Gemini AI feedback with your
              personal application pipeline.
            </p>
          </div>

          <div className="mt-8 rounded-xl overflow-hidden border border-white/10 bg-[#122B4D] aspect-[4/3] max-w-lg">
            {!imgFailed ? (
              <img
                src={WORKSPACE_IMAGE}
                alt="LaunchPad AI career workspace desk"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#122B4D] to-[#0B1F3A]">
                <Briefcase className="w-10 h-10 text-sky-300 mb-3" />
                <p className="text-sm font-medium text-slate-200">
                  Smart Job Preparation Workspace
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-lg">
          <div>
            <p className="text-sm font-semibold text-white">Resume Analyzer</p>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              PDF & text diagnostics for skills, gaps, and ATS clarity.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">JD Skill Matcher</p>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              Compare your profile against target job requirements.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Interview Prep</p>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              Role-specific Technical & HR questions with model answers.
            </p>
          </div>
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          {health && !health.dbConnected && (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
                <div className="flex-1">
                  <p className="font-semibold">MongoDB Atlas connection required</p>
                  <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                    {health.dbError ||
                      'Set MONGODB_URI in your environment variables or AI Studio Secrets panel, then restart the server.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleRetryDb()}
                    disabled={retryingDb}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-900 text-white rounded-md hover:bg-amber-800 disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${retryingDb ? 'animate-spin' : ''}`} />
                    <span>{retryingDb ? 'Testing connection...' : 'Retry Connection'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              {mode === 'login'
                ? 'Access your saved resume reviews, match scores, and pipeline.'
                : 'Start organizing applications and AI-powered interview prep.'}
            </p>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="auth-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-role" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Target Role <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-role"
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="Full-Stack Software Engineer"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 px-4 bg-[#0B1F3A] hover:bg-[#122B4D] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {submitting
                  ? mode === 'login'
                    ? 'Signing in...'
                    : 'Creating account...'
                  : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
              </span>
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
