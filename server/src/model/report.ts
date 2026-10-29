import mongoose from "mongoose";

const activityHistorySchema = new mongoose.Schema({
  action: { type: String, required: true },
  previousStatus: { type: String, default: null },
  newStatus: { type: String, required: true },
  remark: { type: String, default: null },
  performedBy: { type: String, default: null },
  performedByType: { type: String, enum: ["department", "citizen", "system"], default: "system" },
  createdAt: { type: Date, default: Date.now },
});

const reportDetails = new mongoose.Schema(
  {
    category: {
      type: String,
      default: null,
    },

    subcategory: {
      type: String,
      default: null,
    },

    problemDescription: {
      type: String,
      default: null,
    },

    location: {
      type: Object,
      default: null,
    },

    issueType: {
      type: String,
      default: null,
    },

    serviceOrScheme: {
      type: String,
      default: null,
    },

    relevantDateOrDuration: {
      type: String,
      default: null,
    },

    applicationStatus: {
      type: String,
      default: "Reported",
    },

    evidence: {
      type: Array,
      default: null,
    },

    riskOrUrgency: {
      type: String,
      default: null,
    },

    impact: {
      type: String,
      default: null,
    },

    desiredResolution: {
      type: String,
      default: null,
    },

    affectedPeople: {
      type: String,
      default: null,
    },

    supportedBy: {
      type: [String],
      default: [],
    },

    createdBy: {
      type: String,
      default: null,
    },

    resolutionRemark: {
      type: String,
      default: null,
    },

    resolutionEvidence: {
      type: Array,
      default: [],
    },

    resolutionDate: {
      type: Date,
      default: null,
    },

    activityHistory: {
      type: [activityHistorySchema],
      default: [],
    },

    sensitivity: {
      status: {
        type: String,
        enum: ["sensitive", "non_sensitive"],
        required: true,
      },
      reason: {
        type: String,
        required: true,
      },
      classifiedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
      classificationVersion: {
        type: String,
        required: true,
        default: "1.0.0",
      },
    },

    indexingStatus: {
      type: String,
      enum: ["indexed", "pending", "failed", "skipped", "restricted"],
      default: "pending",
    },

    indexingError: {
      type: String,
      default: null,
    },

    lastIndexedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("reportDetails", reportDetails);
