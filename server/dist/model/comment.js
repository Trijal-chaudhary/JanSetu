"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const commentSchema = new mongoose_1.default.Schema({
    reportId: {
        type: String,
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    comment: {
        type: String,
        required: true,
        trim: true,
        maxlength: 3000,
    },
    parentCommentId: {
        type: String,
        default: null,
        index: true,
    },
    upvotes: {
        type: [String],
        default: [],
    },
    downvotes: {
        type: [String],
        default: [],
    },
    likes: {
        type: Number,
        default: 0,
    },
    likedBy: {
        type: [String],
        default: [],
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Compound index for efficient comment thread queries and chronological sorting
commentSchema.index({ reportId: 1, parentCommentId: 1, createdAt: 1 });
// Virtual getter for net vote score
commentSchema.virtual("score").get(function () {
    const up = Array.isArray(this.upvotes) ? this.upvotes.length : 0;
    const down = Array.isArray(this.downvotes) ? this.downvotes.length : 0;
    return up - down;
});
// Alias virtual for content
commentSchema.virtual("content").get(function () {
    return this.comment;
});
exports.default = mongoose_1.default.model("Comment", commentSchema);
//# sourceMappingURL=comment.js.map