import mongoose, { Document, Schema, Types } from 'mongoose';

export type ApplicationStatus = 'Applied' | 'Interview' | 'Selected' | 'Rejected';

export interface IApplication extends Document {
  userId: Types.ObjectId;
  company: string;
  role: string;
  location: string;
  salaryRange: string;
  jobUrl: string;
  status: ApplicationStatus;
  appliedDate: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [120, 'Company name cannot exceed 120 characters'],
    },
    role: {
      type: String,
      required: [true, 'Job role is required'],
      trim: true,
      maxlength: [120, 'Job role cannot exceed 120 characters'],
    },
    location: {
      type: String,
      default: 'Remote',
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    salaryRange: {
      type: String,
      default: '',
      trim: true,
      maxlength: [60, 'Salary range cannot exceed 60 characters'],
    },
    jobUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Job URL cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['Applied', 'Interview', 'Selected', 'Rejected'],
      default: 'Applied',
      required: true,
    },
    appliedDate: {
      type: Date,
      default: () => new Date(),
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  { timestamps: true }
);

export const Application =
  mongoose.models.Application || mongoose.model<IApplication>('Application', applicationSchema);
