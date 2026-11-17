export type ApplicationStatus = 'Applied' | 'Interview' | 'Selected' | 'Rejected';

export type NavSection =
  | 'dashboard'
  | 'resume'
  | 'matcher'
  | 'interview'
  | 'tracker';

export interface User {
  id: string;
  name: string;
  email: string;
  targetRole: string;
  createdAt?: string;
}

export interface HealthStatus {
  status: string;
  dbConnected: boolean;
  dbConfigured: boolean;
  dbError: string | null;
  geminiConfigured: boolean;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  location: string;
  salaryRange: string;
  jobUrl: string;
  status: ApplicationStatus;
  appliedDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeAnalysis {
  id: string;
  fileName: string;
  resumeText: string;
  candidateSummary: string;
  skills: string[];
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  atsReadinessNotes: string[];
  createdAt: string;
}

export interface JobMatch {
  id: string;
  jobTitle: string;
  companyName: string;
  matchScore: number;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  createdAt: string;
}

export interface InterviewQuestion {
  category: 'Technical' | 'HR';
  question: string;
  suggestedAnswer: string;
  keyPoints: string[];
}

export interface InterviewPrep {
  id: string;
  jobRole: string;
  experienceLevel: string;
  focusArea: string;
  questions: InterviewQuestion[];
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type:
    | 'application_created'
    | 'application_updated'
    | 'application_deleted'
    | 'resume_analyzed'
    | 'jd_matched'
    | 'interview_generated';
  title: string;
  detail: string;
  createdAt: string;
}

export interface DashboardSummary {
  stats: {
    totalApplications: number;
    interviewInvitations: number;
    selectedCount: number;
    rejectedCount: number;
    appliedCount: number;
    interviewCount: number;
    avgMatchScore: number | null;
    interviewSetsCount: number;
  };
  statusBreakdown: Array<{
    status: ApplicationStatus;
    count: number;
  }>;
  weeklyTrend: Array<{
    label: string;
    count: number;
  }>;
  recentApplications: Array<{
    id: string;
    company: string;
    role: string;
    status: ApplicationStatus;
    appliedDate: string;
  }>;
  recentActivities: ActivityItem[];
  latestResumeText: string;
}
