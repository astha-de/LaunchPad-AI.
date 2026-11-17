import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInterviewQuestion {
  category: 'Technical' | 'HR';
  question: string;
  suggestedAnswer: string;
  keyPoints: string[];
}

export interface IInterviewPrep extends Document {
  userId: Types.ObjectId;
  jobRole: string;
  experienceLevel: string;
  focusArea: string;
  questions: IInterviewQuestion[];
  createdAt: Date;
}

const interviewQuestionSchema = new Schema<IInterviewQuestion>(
  {
    category: {
      type: String,
      enum: ['Technical', 'HR'],
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    suggestedAnswer: {
      type: String,
      required: true,
    },
    keyPoints: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const interviewPrepSchema = new Schema<IInterviewPrep>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobRole: {
      type: String,
      required: true,
      trim: true,
    },
    experienceLevel: {
      type: String,
      default: 'Mid-Level',
      trim: true,
    },
    focusArea: {
      type: String,
      default: '',
      trim: true,
    },
    questions: {
      type: [interviewQuestionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const InterviewPrep =
  mongoose.models.InterviewPrep ||
  mongoose.model<IInterviewPrep>('InterviewPrep', interviewPrepSchema);
