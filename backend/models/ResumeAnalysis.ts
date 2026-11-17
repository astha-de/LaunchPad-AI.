import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IResumeAnalysis extends Document {
  userId: Types.ObjectId;
  fileName: string;
  resumeText: string;
  candidateSummary: string;
  skills: string[];
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  atsReadinessNotes: string[];
  createdAt: Date;
}

const resumeAnalysisSchema = new Schema<IResumeAnalysis>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      default: 'Pasted Resume',
      trim: true,
    },
    resumeText: {
      type: String,
      required: true,
    },
    candidateSummary: {
      type: String,
      required: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    improvements: {
      type: [String],
      default: [],
    },
    atsReadinessNotes: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export const ResumeAnalysis =
  mongoose.models.ResumeAnalysis ||
  mongoose.model<IResumeAnalysis>('ResumeAnalysis', resumeAnalysisSchema);
