import { Schema, model, Document, Types } from 'mongoose';

export interface ScriptDocument extends Document {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  authorName: string;
  name: string;
  description: string;
  category: string;
  blockedDomains: string[];
  allowCustomDomains: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const scriptSchema = new Schema<ScriptDocument>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 280 },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    blockedDomains: { type: [String], required: true },
    allowCustomDomains: { type: Boolean, default: false },
    usageCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

scriptSchema.index({ name: 'text', description: 'text', category: 'text' });

export const Script = model<ScriptDocument>('Script', scriptSchema);
