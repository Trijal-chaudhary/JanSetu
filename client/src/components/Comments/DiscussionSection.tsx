import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Flame,
  Clock,
  History,
  CornerDownRight,
  Send,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getReportComments,
  addReportComment,
  voteReportComment,
  getProfileImageUrl,
  DEFAULT_AVATAR,
} from "../../services/fetching";
import { type CommentData } from "../Feed/ReportCard";
import styles from "./DiscussionSection.module.css";

interface DiscussionSectionProps {
  reportId: string;
  initialComments?: CommentData[];
  onCommentCountChange?: (count: number) => void;
}

// Helper date formatter
const formatDate = (dateStr?: string) => {
  if (!dateStr) return "Just now";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recently";
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSecs < 60) return "Just now";
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    if (diffSecs < 604800) return `${Math.floor(diffSecs / 86400)}d ago`;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "Recently";
  }
};

// Top-level Inline Reply Editor Component (Keeps textarea mounted and cursor stable)
interface InlineReplyEditorProps {
  commentId: string;
  authorName: string;
  initialDraft: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (parentCommentId: string, text: string) => void;
  onDraftChange: (commentId: string, text: string) => void;
}

const InlineReplyEditor: React.FC<InlineReplyEditorProps> = ({
  commentId,
  authorName,
  initialDraft,
  isSubmitting,
  onCancel,
  onSubmit,
  onDraftChange,
}) => {
  const [replyText, setReplyText] = useState(initialDraft);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setReplyText(text);
    onDraftChange(commentId, text);
  };

  const handleSubmit = () => {
    if (!replyText.trim() || isSubmitting) return;
    onSubmit(commentId, replyText);
  };

  return (
    <div className={styles.inlineReplyBox}>
      <textarea
        key={`reply-textarea-${commentId}`}
        className={styles.inlineReplyTextarea}
        dir="ltr"
        placeholder={`Replying to ${authorName}...`}
        value={replyText}
        onChange={handleChange}
        autoFocus
      />
      <div className={styles.inlineReplyActions}>
        <button
          type="button"
          className={styles.cancelReplyBtn}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.submitReplyBtn}
          disabled={isSubmitting || !replyText.trim()}
          onClick={handleSubmit}
        >
          <Send size={13} />
          <span>{isSubmitting ? "Posting..." : "Submit Reply"}</span>
        </button>
      </div>
    </div>
  );
};

// Top-level Recursive Comment Node Component (Stable component reference prevents remounting on typing)
interface CommentNodeProps {
  comment: CommentData;
  isNested?: boolean;
  activeReplyId: string | null;
  submittingReplyId: string | null;
  replyDrafts: Record<string, string>;
  votingLocks: Set<string>;
  onVote: (commentId: string, direction: "up" | "down") => void;
  onToggleReply: (commentId: string) => void;
  onCancelReply: () => void;
  onDraftChange: (commentId: string, text: string) => void;
  onSubmitReply: (parentCommentId: string, text: string) => void;
}

const CommentNode: React.FC<CommentNodeProps> = ({
  comment,
  isNested = false,
  activeReplyId,
  submittingReplyId,
  replyDrafts,
  votingLocks,
  onVote,
  onToggleReply,
  onCancelReply,
  onDraftChange,
  onSubmitReply,
}) => {
  const cId = (comment.id || comment._id || "").toString();
  const isReplyOpen = activeReplyId === cId;
  const isSubmittingThisReply = submittingReplyId === cId;
  const draftText = replyDrafts[cId] || "";

  const userVote = comment.userVote || null;
  const score = typeof comment.score === "number" ? comment.score : (comment.likes || 0);

  return (
    <div className={styles.commentThread} id={`comment-${cId}`}>
      <div className={isNested ? styles.replyCard : styles.commentCard}>
        {/* Vertical Reddit Voting Column */}
        <div className={styles.voteColumn}>
          <button
            type="button"
            className={`${styles.voteArrowBtn} ${userVote === "up" ? styles.upvoteActive : ""}`}
            onClick={() => onVote(cId, "up")}
            disabled={votingLocks.has(cId)}
            aria-label="Upvote comment"
            title="Upvote"
          >
            <ChevronUp size={18} strokeWidth={2.5} />
          </button>

          <span
            className={`${styles.voteScore} ${
              userVote === "up"
                ? styles.voteScoreUpvoted
                : userVote === "down"
                ? styles.voteScoreDownvoted
                : ""
            }`}
          >
            {score}
          </span>

          <button
            type="button"
            className={`${styles.voteArrowBtn} ${userVote === "down" ? styles.downvoteActive : ""}`}
            onClick={() => onVote(cId, "down")}
            disabled={votingLocks.has(cId)}
            aria-label="Downvote comment"
            title="Downvote"
          >
            <ChevronDown size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Comment Main Body */}
        <div className={styles.commentContent}>
          <div className={styles.commentMetaRow}>
            <div className={styles.commentAuthorGroup}>
              <img
                src={getProfileImageUrl(comment.user?.profilePhoto)}
                alt={comment.user?.name || "Citizen"}
                className={styles.authorAvatar}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
              <span className={styles.authorName}>
                {comment.user?.name || "Citizen Resident"}
              </span>
            </div>
            <span className={styles.commentTimestamp}>
              {formatDate(comment.createdAt)}
            </span>
          </div>

          {/* Comment Text Content */}
          <p className={styles.commentText}>{comment.comment || comment.content}</p>

          {/* Action Bar */}
          <div className={styles.commentActionBar}>
            <button
              type="button"
              className={`${styles.actionButton} ${isReplyOpen ? styles.replyActiveBtn : ""}`}
              onClick={() => onToggleReply(cId)}
            >
              <CornerDownRight size={14} />
              <span>Reply</span>
              {comment.replies && comment.replies.length > 0 && (
                <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                  ({comment.replies.length})
                </span>
              )}
            </button>
          </div>

          {/* Inline Reply Editor */}
          {isReplyOpen && (
            <InlineReplyEditor
              commentId={cId}
              authorName={comment.user?.name || "Citizen"}
              initialDraft={draftText}
              isSubmitting={isSubmittingThisReply}
              onCancel={onCancelReply}
              onSubmit={onSubmitReply}
              onDraftChange={onDraftChange}
            />
          )}
        </div>
      </div>

      {/* Threaded Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply.id || reply._id}
              comment={reply}
              isNested={true}
              activeReplyId={activeReplyId}
              submittingReplyId={submittingReplyId}
              replyDrafts={replyDrafts}
              votingLocks={votingLocks}
              onVote={onVote}
              onToggleReply={onToggleReply}
              onCancelReply={onCancelReply}
              onDraftChange={onDraftChange}
              onSubmitReply={onSubmitReply}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DiscussionSection: React.FC<DiscussionSectionProps> = ({
  reportId,
  initialComments,
  onCommentCountChange,
}) => {
  const { user: authUser, isAuthenticated } = useAuth();
  const currentUserId = authUser?.id || "";

  const [comments, setComments] = useState<CommentData[]>(initialComments || []);
  const [totalCount, setTotalCount] = useState<number>(initialComments?.length || 0);
  const [sort, setSort] = useState<"top" | "newest" | "oldest">("top");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Top-level comment creation state
  const [newCommentText, setNewCommentText] = useState("");
  const [isPostingTopLevel, setIsPostingTopLevel] = useState(false);

  // Inline replies state
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  // Inflight vote guard
  const [votingLocks, setVotingLocks] = useState<Set<string>>(new Set());

  // Fetch comments
  const loadComments = useCallback(
    async (sortMode: "top" | "newest" | "oldest") => {
      if (!reportId) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await getReportComments(reportId, sortMode, currentUserId);
        if (res && res.success && Array.isArray(res.comments)) {
          setComments(res.comments);
          const count = typeof res.totalComments === "number" ? res.totalComments : res.comments.length;
          setTotalCount(count);
          if (onCommentCountChange) {
            onCommentCountChange(count);
          }
        }
      } catch (err) {
        console.error("Failed to load comments:", err);
        setErrorMsg("Failed to load comments. Please refresh.");
      } finally {
        setLoading(false);
      }
    },
    [reportId, currentUserId, onCommentCountChange]
  );

  useEffect(() => {
    loadComments(sort);
  }, [loadComments, sort]);

  // Handle Sort Change
  const handleSortChange = (newSort: "top" | "newest" | "oldest") => {
    if (newSort === sort) return;
    setSort(newSort);
  };

  // Helper to recursively update a comment in the tree
  const updateCommentInTree = (
    list: CommentData[],
    commentId: string,
    updater: (c: CommentData) => CommentData
  ): CommentData[] => {
    return list.map((item) => {
      const itemId = (item.id || item._id || "").toString();
      if (itemId === commentId) {
        return updater(item);
      }
      if (item.replies && item.replies.length > 0) {
        return {
          ...item,
          replies: updateCommentInTree(item.replies, commentId, updater),
        };
      }
      return item;
    });
  };

  // Helper to recursively add a reply under the matching parent
  const addReplyToTree = (
    list: CommentData[],
    parentCommentId: string,
    newReply: CommentData
  ): CommentData[] => {
    return list.map((item) => {
      const itemId = (item.id || item._id || "").toString();
      if (itemId === parentCommentId) {
        const existingReplies = item.replies || [];
        return {
          ...item,
          replies: [...existingReplies, newReply],
          replyCount: (item.replyCount || existingReplies.length) + 1,
        };
      }
      if (item.replies && item.replies.length > 0) {
        return {
          ...item,
          replies: addReplyToTree(item.replies, parentCommentId, newReply),
        };
      }
      return item;
    });
  };

  // Handle Voting
  const handleVote = async (commentId: string, direction: "up" | "down") => {
    if (!isAuthenticated) {
      setErrorMsg("Please log in to vote on discussions.");
      return;
    }

    if (votingLocks.has(commentId)) return;

    // Lock comment while request is inflight
    setVotingLocks((prev) => new Set(prev).add(commentId));

    let rollbackState: CommentData[] = [];
    setComments((prevComments) => {
      rollbackState = prevComments;
      return updateCommentInTree(prevComments, commentId, (comment) => {
        const currentVote = comment.userVote || null;
        const currentScore = typeof comment.score === "number" ? comment.score : (comment.likes || 0);

        let newVote: "up" | "down" | null = null;
        let scoreDiff = 0;

        if (direction === "up") {
          if (currentVote === "up") {
            newVote = null;
            scoreDiff = -1;
          } else if (currentVote === "down") {
            newVote = "up";
            scoreDiff = 2;
          } else {
            newVote = "up";
            scoreDiff = 1;
          }
        } else {
          // direction === "down"
          if (currentVote === "down") {
            newVote = null;
            scoreDiff = 1;
          } else if (currentVote === "up") {
            newVote = "down";
            scoreDiff = -2;
          } else {
            newVote = "down";
            scoreDiff = -1;
          }
        }

        return {
          ...comment,
          userVote: newVote,
          score: currentScore + scoreDiff,
        };
      });
    });

    try {
      const res = await voteReportComment(commentId, direction, currentUserId);
      if (res && res.success) {
        // Authoritative confirmation from server
        setComments((prev) =>
          updateCommentInTree(prev, commentId, (comment) => ({
            ...comment,
            score: res.score,
            userVote: res.userVote,
            upvotes: res.upvotes,
            downvotes: res.downvotes,
          }))
        );
      } else {
        // Rollback
        setComments(rollbackState);
        setErrorMsg(res?.message || "Failed to register vote.");
      }
    } catch (err) {
      console.error("Vote failed:", err);
      setComments(rollbackState);
      setErrorMsg("Network error voting on comment. Reverted.");
    } finally {
      setVotingLocks((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  // Submit Top-Level Comment
  const handlePostTopLevelComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isPostingTopLevel) return;

    if (!isAuthenticated) {
      setErrorMsg("Please log in to leave a comment.");
      return;
    }

    setIsPostingTopLevel(true);
    setErrorMsg(null);

    try {
      const res = await addReportComment(reportId, currentUserId, newCommentText.trim(), null);
      if (res && res.success && res.comment) {
        setComments((prev) => [res.comment, ...prev]);
        setNewCommentText("");
        const updatedTotal = totalCount + 1;
        setTotalCount(updatedTotal);
        if (onCommentCountChange) {
          onCommentCountChange(updatedTotal);
        }
      } else {
        setErrorMsg(res?.message || "Failed to post comment.");
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
      setErrorMsg("Error posting comment. Please try again.");
    } finally {
      setIsPostingTopLevel(false);
    }
  };

  // Submit Inline Reply
  const handleSubmitReply = async (parentCommentId: string, text?: string) => {
    const draft = (text !== undefined ? text : (replyDrafts[parentCommentId] || "")).trim();
    if (!draft || submittingReplyId) return;

    if (!isAuthenticated) {
      setErrorMsg("Please log in to reply.");
      return;
    }

    setSubmittingReplyId(parentCommentId);
    setErrorMsg(null);

    try {
      const res = await addReportComment(reportId, currentUserId, draft, parentCommentId);
      if (res && res.success && res.comment) {
        setComments((prev) => addReplyToTree(prev, parentCommentId, res.comment));
        // Clear draft & close reply box
        setReplyDrafts((prev) => {
          const next = { ...prev };
          delete next[parentCommentId];
          return next;
        });
        setActiveReplyId(null);
        const updatedTotal = totalCount + 1;
        setTotalCount(updatedTotal);
        if (onCommentCountChange) {
          onCommentCountChange(updatedTotal);
        }
      } else {
        setErrorMsg(res?.message || "Failed to post reply.");
      }
    } catch (err) {
      console.error("Failed to post reply:", err);
      setErrorMsg("Error posting reply. Draft preserved.");
    } finally {
      setSubmittingReplyId(null);
    }
  };

  // Toggle inline reply
  const handleToggleReply = useCallback((commentId: string) => {
    setActiveReplyId((prev) => (prev === commentId ? null : commentId));
  }, []);

  // Cancel reply
  const handleCancelReply = useCallback(() => {
    setActiveReplyId(null);
  }, []);

  // Draft change tracking
  const handleDraftChange = useCallback((commentId: string, text: string) => {
    setReplyDrafts((prev) => ({ ...prev, [commentId]: text }));
  }, []);

  return (
    <div className={styles.discussionContainer}>
      {/* Header and Sorting Controls */}
      <div className={styles.discussionHeader}>
        <div className={styles.discussionTitleGroup}>
          <h3 className={styles.discussionTitle}>
            <MessageSquare size={20} color="#2563eb" />
            <span>Community Discussion</span>
          </h3>
          <span className={styles.commentCountBadge}>{totalCount}</span>
        </div>

        {/* Sorting Controls */}
        <div className={styles.sortSelector} role="radiogroup" aria-label="Comment sorting">
          <button
            type="button"
            className={`${styles.sortBtn} ${sort === "top" ? styles.sortBtnActive : ""}`}
            onClick={() => handleSortChange("top")}
          >
            <Flame size={14} />
            <span>Top</span>
          </button>
          <button
            type="button"
            className={`${styles.sortBtn} ${sort === "newest" ? styles.sortBtnActive : ""}`}
            onClick={() => handleSortChange("newest")}
          >
            <Clock size={14} />
            <span>Newest</span>
          </button>
          <button
            type="button"
            className={`${styles.sortBtn} ${sort === "oldest" ? styles.sortBtnActive : ""}`}
            onClick={() => handleSortChange("oldest")}
          >
            <History size={14} />
            <span>Oldest</span>
          </button>
        </div>
      </div>

      {/* Global Error Notice if any */}
      {errorMsg && (
        <div className={styles.errorBanner}>
          <AlertCircle size={15} style={{ display: "inline", marginRight: "6px", verticalAlign: "text-bottom" }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top-Level Add Comment Form */}
      <form onSubmit={handlePostTopLevelComment} className={styles.newCommentForm}>
        {isAuthenticated && (
          <div className={styles.newCommentHeader}>
            <img
              src={getProfileImageUrl(authUser?.profilePhoto)}
              alt={authUser?.name || "Citizen"}
              className={styles.currentUserAvatar}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
            <span className={styles.commentingAsText}>
              Commenting as <span className={styles.commentingAsName}>{authUser?.name || "Citizen Resident"}</span>
            </span>
          </div>
        )}

        <textarea
          className={styles.commentTextarea}
          dir="ltr"
          placeholder={
            isAuthenticated
              ? "Share your insight, evidence, or experience on this grievance..."
              : "Log in to join the discussion on this grievance..."
          }
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          disabled={!isAuthenticated}
          maxLength={3000}
        />

        <div className={styles.newCommentActions}>
          <span className={styles.charCount}>
            {newCommentText.length}/3000
          </span>
          <button
            type="submit"
            className={styles.submitCommentBtn}
            disabled={!isAuthenticated || isPostingTopLevel || !newCommentText.trim()}
          >
            <Send size={14} />
            <span>{isPostingTopLevel ? "Posting..." : "Comment"}</span>
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className={styles.commentsList}>
        {loading && comments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
            Loading discussion threads...
          </div>
        ) : comments.length === 0 ? (
          <div className={styles.emptyCommentsState}>
            <MessageSquare size={36} color="#94a3b8" />
            <p>No community comments yet.</p>
            <span className={styles.emptyCommentsSubtext}>
              Be the first citizen to leave a comment or share local updates on this issue!
            </span>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentNode
              key={comment.id || comment._id}
              comment={comment}
              isNested={false}
              activeReplyId={activeReplyId}
              submittingReplyId={submittingReplyId}
              replyDrafts={replyDrafts}
              votingLocks={votingLocks}
              onVote={handleVote}
              onToggleReply={handleToggleReply}
              onCancelReply={handleCancelReply}
              onDraftChange={handleDraftChange}
              onSubmitReply={handleSubmitReply}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DiscussionSection;
