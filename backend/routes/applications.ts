import { Router } from 'express';
import mongoose from 'mongoose';
import { Activity } from '../models/Activity.ts';
import { Application, type ApplicationStatus } from '../models/Application.ts';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.ts';
import { requireDB } from '../middleware/dbCheck.ts';

const VALID_STATUSES: ApplicationStatus[] = ['Applied', 'Interview', 'Selected', 'Rejected'];

function sanitizeJobUrl(rawUrl: string | undefined): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return '';
}

const router = Router();
router.use(requireAuth, requireDB);

router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, search } = req.query as { status?: string; search?: string };
    const filter: Record<string, unknown> = { userId: req.userId };

    if (status && status !== 'All' && VALID_STATUSES.includes(status as ApplicationStatus)) {
      filter.status = status;
    }

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ company: regex }, { role: regex }, { location: regex }];
    }

    const applications = await Application.find(filter).sort({ appliedDate: -1, createdAt: -1 });

    res.json({
      applications: applications.map((app) => ({
        id: app._id.toString(),
        company: app.company,
        role: app.role,
        location: app.location,
        salaryRange: app.salaryRange,
        jobUrl: app.jobUrl,
        status: app.status,
        appliedDate: app.appliedDate,
        notes: app.notes,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { company, role, location, salaryRange, jobUrl, status, appliedDate, notes } = req.body as {
      company?: string;
      role?: string;
      location?: string;
      salaryRange?: string;
      jobUrl?: string;
      status?: ApplicationStatus;
      appliedDate?: string;
      notes?: string;
    };

    if (!company?.trim() || !role?.trim()) {
      res.status(400).json({ message: 'Company name and job role are required.' });
      return;
    }

    const normalizedStatus: ApplicationStatus =
      status && VALID_STATUSES.includes(status) ? status : 'Applied';

    const parsedDate = appliedDate ? new Date(appliedDate) : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      res.status(400).json({ message: 'Invalid applied date.' });
      return;
    }

    const application = await Application.create({
      userId: req.userId,
      company: company.trim(),
      role: role.trim(),
      location: (location || 'Remote').trim(),
      salaryRange: (salaryRange || '').trim(),
      jobUrl: sanitizeJobUrl(jobUrl),
      status: normalizedStatus,
      appliedDate: parsedDate,
      notes: (notes || '').trim(),
    });

    await Activity.create({
      userId: req.userId,
      type: 'application_created',
      title: `Added ${application.company} · ${application.role}`,
      detail: `Status: ${application.status}`,
    });

    res.status(201).json({
      application: {
        id: application._id.toString(),
        company: application.company,
        role: application.role,
        location: application.location,
        salaryRange: application.salaryRange,
        jobUrl: application.jobUrl,
        status: application.status,
        appliedDate: application.appliedDate,
        notes: application.notes,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid application ID.' });
      return;
    }

    const existing = await Application.findOne({ _id: id, userId: req.userId });
    if (!existing) {
      res.status(404).json({ message: 'Application not found.' });
      return;
    }

    const { company, role, location, salaryRange, jobUrl, status, appliedDate, notes } = req.body as {
      company?: string;
      role?: string;
      location?: string;
      salaryRange?: string;
      jobUrl?: string;
      status?: ApplicationStatus;
      appliedDate?: string;
      notes?: string;
    };

    if (company !== undefined) {
      if (!company.trim()) {
        res.status(400).json({ message: 'Company name cannot be empty.' });
        return;
      }
      existing.company = company.trim();
    }

    if (role !== undefined) {
      if (!role.trim()) {
        res.status(400).json({ message: 'Job role cannot be empty.' });
        return;
      }
      existing.role = role.trim();
    }

    if (location !== undefined) existing.location = location.trim();
    if (salaryRange !== undefined) existing.salaryRange = salaryRange.trim();
    if (jobUrl !== undefined) existing.jobUrl = sanitizeJobUrl(jobUrl);
    if (notes !== undefined) existing.notes = notes.trim();

    const previousStatus = existing.status;
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        res.status(400).json({ message: 'Invalid application status.' });
        return;
      }
      existing.status = status;
    }

    if (appliedDate !== undefined) {
      const parsed = new Date(appliedDate);
      if (Number.isNaN(parsed.getTime())) {
        res.status(400).json({ message: 'Invalid applied date.' });
        return;
      }
      existing.appliedDate = parsed;
    }

    await existing.save();

    const statusDetail =
      previousStatus !== existing.status
        ? `Status moved ${previousStatus} -> ${existing.status}`
        : `Updated details (${existing.status})`;

    await Activity.create({
      userId: req.userId,
      type: 'application_updated',
      title: `Updated ${existing.company} · ${existing.role}`,
      detail: statusDetail,
    });

    res.json({
      application: {
        id: existing._id.toString(),
        company: existing.company,
        role: existing.role,
        location: existing.location,
        salaryRange: existing.salaryRange,
        jobUrl: existing.jobUrl,
        status: existing.status,
        appliedDate: existing.appliedDate,
        notes: existing.notes,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid application ID.' });
      return;
    }

    const deleted = await Application.findOneAndDelete({ _id: id, userId: req.userId });
    if (!deleted) {
      res.status(404).json({ message: 'Application not found.' });
      return;
    }

    await Activity.create({
      userId: req.userId,
      type: 'application_deleted',
      title: `Removed ${deleted.company} · ${deleted.role}`,
      detail: `Was ${deleted.status}`,
    });

    res.json({ message: 'Application deleted successfully.', id });
  } catch (err) {
    next(err);
  }
});

export default router;
