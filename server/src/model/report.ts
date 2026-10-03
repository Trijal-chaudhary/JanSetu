import mongoose from "mongoose";

const reportDetails = new mongoose.Schema({
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
    default: null,
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
});

// module.exports = mongoose.model("reportDetails", reportDetails);
export default mongoose.model("reportDetails", reportDetails);
