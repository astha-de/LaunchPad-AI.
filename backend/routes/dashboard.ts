import { Router } from 'express';
import { Activity } from '../models/Activity.ts';
import { Application, type ApplicationStatus } from '../models/Application.ts';
import { InterviewPrep } from '../models/InterviewPrep.ts';
import { JobMatch } from '../models/JobMatch.ts';
import { ResumeAnalysis } from '../models/ResumeAnalysis.ts';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.ts';
import { requireDB } from '../middleware/dbCheck.ts';

const router = Router();
router.use(requireAuth, requireDB);

router.get('/summary', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId;

    const [applications, activities, latestResume, jobMatches, interviewPreps] =
      await Promise.all([
        Application.find({ userId }).sort({ appliedDate: -1 }),
        Activity.find({ userId }).sort({ createdAt: -1 }).limit(12),
        ResumeAnalysis.findOne({ userId }).sort({ createdAt: -1 }),
        JobMatch.find({ userId }).sort({ createdAt: -1 }).limit(20),
        InterviewPrep.countDocuments({ userId }),
      ]);

    const statusCounts: Record<ApplicationStatus, number> = {
      Applied: 0,
      Interview: 0,
      Selected: 0,
      Rejected: 0,
    };

    for (const app of applications) {
      if (app.status in statusCounts) {
        statusCounts[app.status as ApplicationStatus] += 1;
      }
    }

    const totalApplications = applications.length;
    const interviewInvitations = statusCounts.Interview + statusCounts.Selected;
    const avgMatchScore =
      jobMatches.length > 0
        ? Math.round(
            jobMatches.reduce((acc, item) => acc + item.matchScore, 0) / jobMatches.length
          )
        : null;

    // Build 6-week activity buckets (from 5 weeks ago to current week)
    const now = new Date();
    const weeklyTrend: Array<{ label: string; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - i * 7);
      weekEnd.setHours(23, 59, 59, 999);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const count = applications.filter((app) => {
        const d = new Date(app.appliedDate || app.createdAt);
        return d >= weekStart && d <= weekEnd;
      }).length;

      const label = weekStart.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      weeklyTrend.push({ label, count });
    }

    res.json({
      stats: {
        totalApplications,
        interviewInvitations,
        selectedCount: statusCounts.Selected,
        rejectedCount: statusCounts.Rejected,
        appliedCount: statusCounts.Applied,
        interviewCount: statusCounts.Interview,
        avgMatchScore,
        interviewSetsCount: interviewPreps,
      },
      statusBreakdown: [
        { status: 'Applied', count: statusCounts.Applied },
        { status: 'Interview', count: statusCounts.Interview },
        { status: 'Selected', count: statusCounts.Selected },
        { status: 'Rejected', count: statusCounts.Rejected },
      ],
      weeklyTrend,
      recentApplications: applications.slice(0, 5).map((app) => ({
        id: app._id.toString(),
        company: app.company,
        role: app.role,
        status: app.status,
        appliedDate: app.appliedDate,
      })),
      recentActivities: activities.map((act) => ({
        id: act._id.toString(),
        type: act.type,
        title: act.title,
        detail: act.detail,
        createdAt: act.createdAt,
      })),
      latestResumeText: latestResume?.resumeText || '',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
