import mongoose, { Document, Schema, Types } from 'mongoose';

export type ActivityType =
  | 'application_created'
  | 'application_updated'
  | 'application_deleted'
  | 'resume_analyzed'
  | 'jd_matched'
  | 'interview_generated';

export interface IActivity extends Document {
  userId: Types.ObjectId;
  type: ActivityType;
  title: string;
  detail: string;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'application_created',
        'application_updated',
        'application_deleted',
        'resume_analyzed',
        'jd_matched',
        'interview_generated',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    detail: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

export const Activity =
  mongoose.models.Activity || mongoose.model<IActivity>('Activity', activitySchema);
