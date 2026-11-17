import { GoogleGenAI, Type } from '@google/genai';

const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'YOUR_GEMINI_API_KEY') {
    const error = new Error(
      'GEMINI_API_KEY is not configured. Add a valid Gemini API key in Settings > Secrets or your .env file.'
    ) as Error & { statusCode?: number };
    error.statusCode = 500;
    throw error;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(operation: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('503') ||
        msg.includes('500') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('DEADLINE_EXCEEDED');
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      const delayMs = 600 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export function formatGeminiError(err: unknown): { status: number; message: string } {
  const errObj = err as { status?: number; statusCode?: number; message?: string };
  const rawMessage = errObj?.message || 'Unexpected error communicating with Gemini AI.';

  if (errObj?.statusCode) {
    return { status: errObj.statusCode, message: rawMessage };
  }
  if (rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('400')) {
    return {
      status: 400,
      message: 'Invalid Gemini API key or malformed request. Check GEMINI_API_KEY in Secrets or .env.',
    };
  }
  if (rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('403')) {
    return {
      status: 403,
      message: 'Gemini API permission denied. Verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')) {
    return {
      status: 429,
      message: 'Gemini API rate limit reached. Please wait a moment and try again.',
    };
  }
  if (rawMessage.includes('NOT_FOUND') || rawMessage.includes('404')) {
    return {
      status: 502,
      message: 'Configured Gemini model was not found. Please verify model availability.',
    };
  }

  return { status: 500, message: rawMessage };
}

export interface ResumeAnalysisOutput {
  extractedText: string;
  candidateSummary: string;
  skills: string[];
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  atsReadinessNotes: string[];
}

export async function analyzeResumeWithGemini(params: {
  resumeText?: string;
  pdfBuffer?: Buffer;
}): Promise<ResumeAnalysisOutput> {
  const ai = getGeminiClient();

  const instructionPrompt =
    'You are an expert technical recruiter and executive career coach. Analyze the provided resume thoroughly and objectively. ' +
    'Extract all concrete technical and domain skills, write a concise 2-3 sentence candidate summary, identify specific strengths supported by the resume, ' +
    'identify concrete weaknesses or missing proof (e.g., lack of quantified impact, missing architecture details), provide actionable improvement rewrites/suggestions, ' +
    'and provide ATS readiness observations. Also return a clean plain-text version of the full resume content in extractedText.';

  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [];

  if (params.pdfBuffer) {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: params.pdfBuffer.toString('base64'),
      },
    });
    parts.push({
      text: `${instructionPrompt}\n\nAnalyze the attached PDF resume document.`,
    });
  } else if (params.resumeText) {
    parts.push({
      text: `${instructionPrompt}\n\nResume Content:\n"""\n${params.resumeText}\n"""`,
    });
  } else {
    throw new Error('Either resumeText or pdfBuffer is required.');
  }

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        systemInstruction:
          'Provide honest, specific, practical career feedback grounded strictly in the resume provided. Never invent experience the candidate did not write.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedText: {
              type: Type.STRING,
              description: 'Clean plain-text transcription of the resume content.',
            },
            candidateSummary: {
              type: Type.STRING,
              description: 'Concise 2-3 sentence executive summary of the candidate profile.',
            },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of technical, tool, and domain skills identified in the resume.',
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-6 concrete strengths backed by evidence in the resume.',
            },
            weaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-5 specific gaps, weak phrasing, or missing metrics in the resume.',
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '4-6 actionable, concrete edits to strengthen impact and clarity.',
            },
            atsReadinessNotes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2-4 specific formatting, keyword, or ATS parsing recommendations.',
            },
          },
          required: [
            'extractedText',
            'candidateSummary',
            'skills',
            'strengths',
            'weaknesses',
            'improvements',
            'atsReadinessNotes',
          ],
        },
      },
    })
  );

  const raw = (response.text ?? '{}').trim();
  const parsed = JSON.parse(raw) as ResumeAnalysisOutput;

  return {
    extractedText: parsed.extractedText || params.resumeText || '',
    candidateSummary: parsed.candidateSummary || 'Analysis completed.',
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    atsReadinessNotes: Array.isArray(parsed.atsReadinessNotes) ? parsed.atsReadinessNotes : [],
  };
}

export interface JobMatchOutput {
  matchScore: number;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
}

export async function matchJobDescriptionWithGemini(params: {
  resumeText: string;
  jobDescription: string;
  jobTitle?: string;
  companyName?: string;
}): Promise<JobMatchOutput> {
  const ai = getGeminiClient();

  const prompt = `Compare the candidate's resume against the target job description and compute an accurate skill match evaluation.

Target Role: ${params.jobTitle || 'Not specified'}
Target Company: ${params.companyName || 'Not specified'}

Candidate Resume:
"""
${params.resumeText}
"""

Job Description:
"""
${params.jobDescription}
"""`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction:
          'Evaluate skill alignment strictly and realistically. Return an integer matchScore between 0 and 100 reflecting true coverage of required and preferred skills, clear lists of matchedSkills and missingSkills, and concrete recommendations to close gaps.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchScore: {
              type: Type.INTEGER,
              description: 'Integer percentage match score from 0 to 100.',
            },
            summary: {
              type: Type.STRING,
              description: '2-3 sentence assessment of overall fit for this role.',
            },
            matchedSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Skills and qualifications present in both the resume and job description.',
            },
            missingSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Required or preferred skills from the job description missing or weak in the resume.',
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-5 specific tailoring tips or study actions to improve candidacy.',
            },
          },
          required: [
            'matchScore',
            'summary',
            'matchedSkills',
            'missingSkills',
            'recommendations',
          ],
        },
      },
    })
  );

  const raw = (response.text ?? '{}').trim();
  const parsed = JSON.parse(raw) as JobMatchOutput;
  const clampedScore = Math.max(0, Math.min(100, Math.round(Number(parsed.matchScore) || 0)));

  return {
    matchScore: clampedScore,
    summary: parsed.summary || 'Comparison completed.',
    matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
    missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
  };
}

export interface InterviewQuestionOutput {
  category: 'Technical' | 'HR';
  question: string;
  suggestedAnswer: string;
  keyPoints: string[];
}

export async function generateInterviewPrepWithGemini(params: {
  jobRole: string;
  experienceLevel: string;
  focusArea?: string;
  resumeText?: string;
}): Promise<{ questions: InterviewQuestionOutput[] }> {
  const ai = getGeminiClient();

  const prompt = `Generate a structured interview preparation set of 8 high-signal questions (5 Technical questions and 3 HR/Behavioral questions) for a candidate preparing for the following role:

Job Role: ${params.jobRole}
Experience Level: ${params.experienceLevel}
Focus Area: ${params.focusArea || 'General role competencies'}
${params.resumeText ? `\nCandidate Resume Context (tailor relevant questions):\n"""\n${params.resumeText.slice(0, 4000)}\n"""` : ''}`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction:
          'Produce realistic, high-bar interview questions tailored to the exact role and seniority. Categorize every item strictly as either "Technical" or "HR". Provide strong, structured model answers (using STAR method for HR and clear architectural/conceptual depth for Technical) plus 3 concise key talking points per question.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: {
                    type: Type.STRING,
                    description: 'Must be exactly "Technical" or "HR".',
                  },
                  question: {
                    type: Type.STRING,
                    description: 'The interview question.',
                  },
                  suggestedAnswer: {
                    type: Type.STRING,
                    description: 'Well-structured model answer.',
                  },
                  keyPoints: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '2-4 concise bullet talking points to cover.',
                  },
                },
                required: ['category', 'question', 'suggestedAnswer', 'keyPoints'],
              },
            },
          },
          required: ['questions'],
        },
      },
    })
  );

  const raw = (response.text ?? '{}').trim();
  const parsed = JSON.parse(raw) as { questions?: InterviewQuestionOutput[] };

  const normalized = (Array.isArray(parsed.questions) ? parsed.questions : []).map((q) => ({
    category: (q.category === 'HR' ? 'HR' : 'Technical') as 'Technical' | 'HR',
    question: q.question || '',
    suggestedAnswer: q.suggestedAnswer || '',
    keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints : [],
  }));

  return { questions: normalized };
}
