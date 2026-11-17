import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IJobMatch extends Document {
  userId: Types.ObjectId;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  matchScore: number;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  createdAt: Date;
}

const jobMatchSchema = new Schema<IJobMatch>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobTitle: {
      type: String,
      default: 'Target Position',
      trim: true,
    },
    companyName: {
      type: String,
      default: '',
      trim: true,
    },
    jobDescription: {
      type: String,
      required: true,
    },
    matchScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    summary: {
      type: String,
      required: true,
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export const JobMatch =
  mongoose.models.JobMatch || mongoose.model<IJobMatch>('JobMatch', jobMatchSchema);
