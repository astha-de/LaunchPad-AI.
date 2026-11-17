import type {
  Application,
  ApplicationStatus,
  DashboardSummary,
  HealthStatus,
  InterviewPrep,
  JobMatch,
  ResumeAnalysis,
  User,
} from '../types/index.ts';

const TOKEN_STORAGE_KEY = 'launchpad_ai_token';

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isFormData = false
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    if (unauthorizedHandler && !path.startsWith('/auth/login') && !path.startsWith('/auth/signup')) {
      unauthorizedHandler();
    }
    throw new Error(data.message || 'Authentication required.');
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data as T;
}

export const api = {
  getHealth(): Promise<HealthStatus> {
    return request<HealthStatus>('/health');
  },

  reconnectDatabase(): Promise<HealthStatus> {
    return request<HealthStatus>('/health/reconnect', { method: 'POST' });
  },

  signup(payload: {
    name: string;
    email: string;
    password: string;
    targetRole?: string;
  }): Promise<{ token: string; user: User }> {
    return request<{ token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login(payload: { email: string; password: string }): Promise<{ token: string; user: User }> {
    return request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  logout(): Promise<{ message: string }> {
    return request<{ message: string }>('/auth/logout', { method: 'POST' });
  },

  getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/me');
  },

  updateProfile(payload: { name?: string; targetRole?: string }): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getDashboardSummary(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/dashboard/summary');
  },

  getApplications(params?: { status?: string; search?: string }): Promise<{ applications: Application[] }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'All') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<{ applications: Application[] }>(`/applications${qs ? `?${qs}` : ''}`);
  },

  createApplication(payload: {
    company: string;
    role: string;
    location?: string;
    salaryRange?: string;
    jobUrl?: string;
    status: ApplicationStatus;
    appliedDate?: string;
    notes?: string;
  }): Promise<{ application: Application }> {
    return request<{ application: Application }>('/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateApplication(
    id: string,
    payload: Partial<{
      company: string;
      role: string;
      location: string;
      salaryRange: string;
      jobUrl: string;
      status: ApplicationStatus;
      appliedDate: string;
      notes: string;
    }>
  ): Promise<{ application: Application }> {
    return request<{ application: Application }>(`/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteApplication(id: string): Promise<{ message: string; id: string }> {
    return request<{ message: string; id: string }>(`/applications/${id}`, {
      method: 'DELETE',
    });
  },

  analyzeResumeFile(file: File): Promise<{ analysis: ResumeAnalysis }> {
    const formData = new FormData();
    formData.append('resumeFile', file);
    return request<{ analysis: ResumeAnalysis }>(
      '/ai/analyze-resume',
      {
        method: 'POST',
        body: formData,
      },
      true
    );
  },

  analyzeResumeText(resumeText: string): Promise<{ analysis: ResumeAnalysis }> {
    return request<{ analysis: ResumeAnalysis }>('/ai/analyze-resume', {
      method: 'POST',
      body: JSON.stringify({ resumeText }),
    });
  },

  getResumeHistory(): Promise<{ history: ResumeAnalysis[] }> {
    return request<{ history: ResumeAnalysis[] }>('/ai/resume-history');
  },

  matchJobDescription(payload: {
    resumeText: string;
    jobDescription: string;
    jobTitle?: string;
    companyName?: string;
  }): Promise<{ match: JobMatch }> {
    return request<{ match: JobMatch }>('/ai/match-job', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMatchHistory(): Promise<{ history: JobMatch[] }> {
    return request<{ history: JobMatch[] }>('/ai/match-history');
  },

  generateInterviewPrep(payload: {
    jobRole: string;
    experienceLevel: string;
    focusArea?: string;
    resumeText?: string;
  }): Promise<{ prep: InterviewPrep }> {
    return request<{ prep: InterviewPrep }>('/ai/interview-prep', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getInterviewHistory(): Promise<{ history: InterviewPrep[] }> {
    return request<{ history: InterviewPrep[] }>('/ai/interview-history');
  },
};
