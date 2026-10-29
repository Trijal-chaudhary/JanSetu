"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const draftSchema = new mongoose_1.default.Schema({
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
}, { timestamps: true });
exports.default = mongoose_1.default.model("ReportDraft", draftSchema);
//# sourceMappingURL=draft.js.map