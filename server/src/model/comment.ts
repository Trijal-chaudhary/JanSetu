import mongoose from "mongoose";

export interface IComment extends mongoose.Document {
  reportId: string;
  userId: string;
  comment: string;
  parentCommentId: string | null;
  upvotes: string[];
  downvotes: string[];
  likes: number;
  likedBy: string[];
  createdAt: Date;
  updatedAt: Date;
  score: number;
  content: string;
}

const commentSchema = new mongoose.Schema(
  {
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for efficient comment thread queries and chronological sorting
commentSchema.index({ reportId: 1, parentCommentId: 1, createdAt: 1 });

// Virtual getter for net vote score
commentSchema.virtual("score").get(function (this: any) {
  const up = Array.isArray(this.upvotes) ? this.upvotes.length : 0;
  const down = Array.isArray(this.downvotes) ? this.downvotes.length : 0;
  return up - down;
});

// Alias virtual for content
commentSchema.virtual("content").get(function (this: any) {
  return this.comment;
});

export default mongoose.model<IComment>("Comment", commentSchema);
