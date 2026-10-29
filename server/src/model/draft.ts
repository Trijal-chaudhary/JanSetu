import mongoose from "mongoose";

export interface SensitivityClassification {
  status: "sensitive" | "non_sensitive";
  reason: string;
  classifiedAt: Date;
  classificationVersion: string;
}

export interface IDraftDocument extends mongoose.Document {
  draftId: string;
  createdBy: string;
  contentHash: string;
  draftData: Record<string, any>;
  sensitivity?: SensitivityClassification | null;
  finalizedReportId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const draftSchema = new mongoose.Schema(
  {
    draftId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    contentHash: {
      type: String,
      required: true,
    },
    draftData: {
      type: Object,
      required: true,
    },
    sensitivity: {
      status: {
        type: String,
        enum: ["sensitive", "non_sensitive"],
        required: false,
      },
      reason: {
        type: String,
        required: false,
      },
      classifiedAt: {
        type: Date,
        required: false,
      },
      classificationVersion: {
        type: String,
        required: false,
      },
    },
    finalizedReportId: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // 24-hour TTL expiration
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDraftDocument>("ReportDraft", draftSchema);

