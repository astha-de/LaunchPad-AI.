import { Router } from 'express';
import multer from 'multer';
import { Activity } from '../models/Activity.ts';
import { InterviewPrep } from '../models/InterviewPrep.ts';
import { JobMatch } from '../models/JobMatch.ts';
import { ResumeAnalysis } from '../models/ResumeAnalysis.ts';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.ts';
import { requireDB } from '../middleware/dbCheck.ts';
import {
  analyzeResumeWithGemini,
  formatGeminiError,
  generateInterviewPrepWithGemini,
  matchJobDescriptionWithGemini,
} from '../services/gemini.ts';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB PDF limit
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported for file upload.'));
    }
  },
});

const router = Router();
router.use(requireAuth, requireDB);

router.post('/analyze-resume', (req: AuthenticatedRequest, res, next) => {
  upload.single('resumeFile')(req, res, async (uploadErr) => {
    if (uploadErr) {
      res.status(400).json({
        message: uploadErr instanceof Error ? uploadErr.message : 'File upload failed.',
      });
      return;
    }

    try {
      const resumeText = typeof req.body?.resumeText === 'string' ? req.body.resumeText.trim() : '';
      const file = req.file;

      if (!file && resumeText.length < 40) {
        res.status(400).json({
          message: 'Please upload a PDF resume or paste at least 40 characters of resume text.',
        });
        return;
      }

      const aiResult = await analyzeResumeWithGemini({
        pdfBuffer: file ? file.buffer : undefined,
        resumeText: file ? undefined : resumeText,
      });

      const saved = await ResumeAnalysis.create({
        userId: req.userId,
        fileName: file ? file.originalname : 'Pasted Resume',
        resumeText: aiResult.extractedText || resumeText,
        candidateSummary: aiResult.candidateSummary,
        skills: aiResult.skills,
        strengths: aiResult.strengths,
        weaknesses: aiResult.weaknesses,
        improvements: aiResult.improvements,
        atsReadinessNotes: aiResult.atsReadinessNotes,
      });

      await Activity.create({
        userId: req.userId,
        type: 'resume_analyzed',
        title: `Analyzed resume: ${saved.fileName}`,
        detail: `${saved.skills.length} skills extracted`,
      });

      res.status(201).json({
        analysis: {
          id: saved._id.toString(),
          fileName: saved.fileName,
          resumeText: saved.resumeText,
          candidateSummary: saved.candidateSummary,
          skills: saved.skills,
          strengths: saved.strengths,
          weaknesses: saved.weaknesses,
          improvements: saved.improvements,
          atsReadinessNotes: saved.atsReadinessNotes,
          createdAt: saved.createdAt,
        },
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      if (formatted.status !== 500 || (err as Error)?.message?.includes('GEMINI_API_KEY')) {
        res.status(formatted.status).json({ message: formatted.message });
        return;
      }
      next(err);
    }
  });
});

router.get('/resume-history', async (req: AuthenticatedRequest, res, next) => {
  try {
    const items = await ResumeAnalysis.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      history: items.map((item) => ({
        id: item._id.toString(),
        fileName: item.fileName,
        resumeText: item.resumeText,
        candidateSummary: item.candidateSummary,
        skills: item.skills,
        strengths: item.strengths,
        weaknesses: item.weaknesses,
        improvements: item.improvements,
        atsReadinessNotes: item.atsReadinessNotes,
        createdAt: item.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/match-job', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { resumeText, jobDescription, jobTitle, companyName } = req.body as {
      resumeText?: string;
      jobDescription?: string;
      jobTitle?: string;
      companyName?: string;
    };

    if (!resumeText?.trim() || resumeText.trim().length < 40) {
      res.status(400).json({
        message: 'Please provide your resume text (at least 40 characters) for comparison.',
      });
      return;
    }

    if (!jobDescription?.trim() || jobDescription.trim().length < 40) {
      res.status(400).json({
        message: 'Please paste a job description (at least 40 characters) to compare.',
      });
      return;
    }

    const aiResult = await matchJobDescriptionWithGemini({
      resumeText: resumeText.trim(),
      jobDescription: jobDescription.trim(),
      jobTitle: jobTitle?.trim(),
      companyName: companyName?.trim(),
    });

    const saved = await JobMatch.create({
      userId: req.userId,
      jobTitle: jobTitle?.trim() || 'Target Role',
      companyName: companyName?.trim() || '',
      jobDescription: jobDescription.trim(),
      matchScore: aiResult.matchScore,
      summary: aiResult.summary,
      matchedSkills: aiResult.matchedSkills,
      missingSkills: aiResult.missingSkills,
      recommendations: aiResult.recommendations,
    });

    await Activity.create({
      userId: req.userId,
      type: 'jd_matched',
      title: `Matched JD: ${saved.jobTitle}${saved.companyName ? ` at ${saved.companyName}` : ''}`,
      detail: `Skill match score: ${saved.matchScore}%`,
    });

    res.status(201).json({
      match: {
        id: saved._id.toString(),
        jobTitle: saved.jobTitle,
        companyName: saved.companyName,
        matchScore: saved.matchScore,
        summary: saved.summary,
        matchedSkills: saved.matchedSkills,
        missingSkills: saved.missingSkills,
        recommendations: saved.recommendations,
        createdAt: saved.createdAt,
      },
    });
  } catch (err) {
    const formatted = formatGeminiError(err);
    if (formatted.status !== 500 || (err as Error)?.message?.includes('GEMINI_API_KEY')) {
      res.status(formatted.status).json({ message: formatted.message });
      return;
    }
    next(err);
  }
});

router.get('/match-history', async (req: AuthenticatedRequest, res, next) => {
  try {
    const items = await JobMatch.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      history: items.map((item) => ({
        id: item._id.toString(),
        jobTitle: item.jobTitle,
        companyName: item.companyName,
        matchScore: item.matchScore,
        summary: item.summary,
        matchedSkills: item.matchedSkills,
        missingSkills: item.missingSkills,
        recommendations: item.recommendations,
        createdAt: item.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/interview-prep', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { jobRole, experienceLevel, focusArea, resumeText } = req.body as {
      jobRole?: string;
      experienceLevel?: string;
      focusArea?: string;
      resumeText?: string;
    };

    if (!jobRole?.trim() || jobRole.trim().length < 2) {
      res.status(400).json({ message: 'Please specify a target job role.' });
      return;
    }

    const aiResult = await generateInterviewPrepWithGemini({
      jobRole: jobRole.trim(),
      experienceLevel: experienceLevel?.trim() || 'Mid-Level',
      focusArea: focusArea?.trim(),
      resumeText: resumeText?.trim(),
    });

    const saved = await InterviewPrep.create({
      userId: req.userId,
      jobRole: jobRole.trim(),
      experienceLevel: experienceLevel?.trim() || 'Mid-Level',
      focusArea: focusArea?.trim() || '',
      questions: aiResult.questions,
    });

    await Activity.create({
      userId: req.userId,
      type: 'interview_generated',
      title: `Generated interview prep: ${saved.jobRole}`,
      detail: `${saved.questions.length} Technical & HR questions`,
    });

    res.status(201).json({
      prep: {
        id: saved._id.toString(),
        jobRole: saved.jobRole,
        experienceLevel: saved.experienceLevel,
        focusArea: saved.focusArea,
        questions: saved.questions,
        createdAt: saved.createdAt,
      },
    });
  } catch (err) {
    const formatted = formatGeminiError(err);
    if (formatted.status !== 500 || (err as Error)?.message?.includes('GEMINI_API_KEY')) {
      res.status(formatted.status).json({ message: formatted.message });
      return;
    }
    next(err);
  }
});

router.get('/interview-history', async (req: AuthenticatedRequest, res, next) => {
  try {
    const items = await InterviewPrep.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      history: items.map((item) => ({
        id: item._id.toString(),
        jobRole: item.jobRole,
        experienceLevel: item.experienceLevel,
        focusArea: item.focusArea,
        questions: item.questions,
        createdAt: item.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
