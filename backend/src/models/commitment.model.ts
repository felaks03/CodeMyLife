import { Schema, model, Document, Types } from 'mongoose';

export type CommitmentStatus = 'active' | 'completed' | 'cancelled';

export interface CommitmentDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  scriptId: Types.ObjectId;
  scriptName: string;
  name: string;
  blockedDomains: string[];
  days: number[];
  startTime: string;
  endTime: string;
  startsAt: Date;
  endsAt: Date;
  status: CommitmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const commitmentSchema = new Schema<CommitmentDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scriptId: { type: Schema.Types.ObjectId, ref: 'Script', required: true },
    scriptName: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    blockedDomains: { type: [String], required: true },
    days: { type: [Number], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' }
  },
  { timestamps: true }
);

export const Commitment = model<CommitmentDocument>('Commitment', commitmentSchema);
