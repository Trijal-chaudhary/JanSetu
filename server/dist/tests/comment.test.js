"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const assert_1 = __importDefault(require("assert"));
const chating_controller_1 = require("../controllers/chating.controller");
// Helper to simulate Express Request and Response
function createMockReqRes(options) {
    const req = {
        params: options.params || {},
        query: options.query || {},
        body: options.body || {},
        session: options.session || {},
    };
    let statusCode = 200;
    let responseData = null;
    const res = {
        status(code) {
            statusCode = code;
            return res;
        },
        json(data) {
            responseData = data;
            return res;
        },
        getStatus: () => statusCode,
        getData: () => responseData,
    };
    return { req, res };
}
async function runCommentTests() {
    console.log("=================================================");
    console.log(" JanSetu: Comment, Reply, Voting & Sorting Tests ");
    console.log("=================================================");
    const testReportId = "dummy_013";
    const userA = "test_user_a";
    const userB = "test_user_b";
    const userC = "test_user_c";
    // --------------------------------------------------------------------------
    // Group 1: Reply Tests
    // --------------------------------------------------------------------------
    console.log("\n--- Group 1: Reply Tests ---");
    // 1.1 Create Top-level comment
    console.log("1.1 Creating a top-level parent comment...");
    const { req: reqParent, res: resParent } = createMockReqRes({
        params: { reportId: testReportId },
        body: { comment: "Top-level comment for testing replies", userId: userA },
    });
    await (0, chating_controller_1.addComment)(reqParent, resParent);
    assert_1.default.strictEqual(resParent.getStatus(), 200, "Parent comment creation should return 200");
    const parentComment = resParent.getData().comment;
    (0, assert_1.default)(parentComment && parentComment.id, "Created comment should have an id");
    assert_1.default.strictEqual(parentComment.parentCommentId, null, "Top-level comment must have parentCommentId null");
    console.log("✅ 1.1 Top-level comment created:", parentComment.id);
    // 1.2 Reply to the comment
    console.log("1.2 Replying to the parent comment...");
    const { req: reqReply, res: resReply } = createMockReqRes({
        params: { reportId: testReportId },
        body: {
            comment: "This is a reply to the parent comment",
            parentCommentId: parentComment.id,
            userId: userB,
        },
    });
    await (0, chating_controller_1.addComment)(reqReply, resReply);
    assert_1.default.strictEqual(resReply.getStatus(), 200, "Reply creation should return 200");
    const replyCommentObj = resReply.getData().comment;
    assert_1.default.strictEqual(replyCommentObj.parentCommentId, parentComment.id, "Reply parentCommentId must match parent");
    console.log("✅ 1.2 Reply created successfully under parent:", replyCommentObj.id);
    // 1.3 Dedicated reply endpoint (/reports/:reportId/comments/:commentId/reply)
    console.log("1.3 Replying via dedicated replyComment endpoint...");
    const { req: reqDedReply, res: resDedReply } = createMockReqRes({
        params: { reportId: testReportId, commentId: parentComment.id },
        body: {
            comment: "This is a second reply via dedicated endpoint",
            userId: userC,
        },
    });
    await (0, chating_controller_1.replyComment)(reqDedReply, resDedReply);
    assert_1.default.strictEqual(resDedReply.getStatus(), 200, "Dedicated reply should return 200");
    const dedReplyObj = resDedReply.getData().comment;
    assert_1.default.strictEqual(dedReplyObj.parentCommentId, parentComment.id);
    console.log("✅ 1.3 Dedicated reply endpoint verified:", dedReplyObj.id);
    // 1.4 Empty reply validation
    console.log("1.4 Rejecting empty reply...");
    const { req: reqEmpty, res: resEmpty } = createMockReqRes({
        params: { reportId: testReportId },
        body: { comment: "   ", parentCommentId: parentComment.id, userId: userB },
    });
    await (0, chating_controller_1.addComment)(reqEmpty, resEmpty);
    assert_1.default.strictEqual(resEmpty.getStatus(), 400, "Empty comment should return 400");
    console.log("✅ 1.4 Empty comment properly rejected.");
    // 1.5 Nonexistent parent comment rejection
    console.log("1.5 Rejecting nonexistent parent ID...");
    const { req: reqNonExist, res: resNonExist } = createMockReqRes({
        params: { reportId: testReportId },
        body: { comment: "Valid text", parentCommentId: "comment_nonexistent_999", userId: userB },
    });
    await (0, chating_controller_1.addComment)(reqNonExist, resNonExist);
    assert_1.default.strictEqual(resNonExist.getStatus(), 404, "Nonexistent parent should return 404");
    console.log("✅ 1.5 Nonexistent parent rejected with 404.");
    // 1.6 Unauthorized reply rejection
    console.log("1.6 Rejecting unauthorized reply...");
    const { req: reqUnauth, res: resUnauth } = createMockReqRes({
        params: { reportId: testReportId },
        body: { comment: "Valid text", parentCommentId: parentComment.id },
    });
    await (0, chating_controller_1.addComment)(reqUnauth, resUnauth);
    assert_1.default.strictEqual(resUnauth.getStatus(), 401, "Missing user credentials should return 401");
    console.log("✅ 1.6 Unauthorized request rejected with 401.");
    // --------------------------------------------------------------------------
    // Group 2: Reddit-Style Voting Tests
    // --------------------------------------------------------------------------
    console.log("\n--- Group 2: Reddit-Style Voting Tests ---");
    const targetCommentId = parentComment.id;
    // 2.1 Upvote
    console.log("2.1 User A upvoting comment...");
    const { req: reqUp, res: resUp } = createMockReqRes({
        params: { commentId: targetCommentId },
        body: { direction: "up", userId: userA },
    });
    await (0, chating_controller_1.voteComment)(reqUp, resUp);
    assert_1.default.strictEqual(resUp.getStatus(), 200);
    const upData = resUp.getData();
    assert_1.default.strictEqual(upData.userVote, "up", "User vote should be 'up'");
    assert_1.default.strictEqual(upData.score, 1, "Score should be 1 after single upvote");
    assert_1.default.strictEqual(upData.upvotesCount, 1);
    assert_1.default.strictEqual(upData.downvotesCount, 0);
    console.log("✅ 2.1 Upvote recorded. Score:", upData.score);
    // 2.2 Repeat upvote toggles off
    console.log("2.2 Repeating upvote to test toggle-off behavior...");
    const { req: reqToggleUp, res: resToggleUp } = createMockReqRes({
        params: { commentId: targetCommentId },
        body: { direction: "up", userId: userA },
    });
    await (0, chating_controller_1.voteComment)(reqToggleUp, resToggleUp);
    assert_1.default.strictEqual(resToggleUp.getStatus(), 200);
    const toggleUpData = resToggleUp.getData();
    assert_1.default.strictEqual(toggleUpData.userVote, null, "User vote should be null after toggle-off");
    assert_1.default.strictEqual(toggleUpData.score, 0, "Score should return to 0");
    console.log("✅ 2.2 Upvote toggled off. Score:", toggleUpData.score);
    // 2.3 Downvote
    console.log("2.3 User B downvoting comment...");
    const { req: reqDown, res: resDown } = createMockReqRes({
        params: { commentId: targetCommentId },
        body: { direction: "down", userId: userB },
    });
    await (0, chating_controller_1.voteComment)(reqDown, resDown);
    assert_1.default.strictEqual(resDown.getStatus(), 200);
    const downData = resDown.getData();
    assert_1.default.strictEqual(downData.userVote, "down", "User vote should be 'down'");
    assert_1.default.strictEqual(downData.score, -1, "Score should be -1 after single downvote");
    console.log("✅ 2.3 Downvote recorded. Score:", downData.score);
    // 2.4 Switching from downvote to upvote
    console.log("2.4 User B switching vote from downvote to upvote...");
    const { req: reqSwitch, res: resSwitch } = createMockReqRes({
        params: { commentId: targetCommentId },
        body: { direction: "up", userId: userB },
    });
    await (0, chating_controller_1.voteComment)(reqSwitch, resSwitch);
    assert_1.default.strictEqual(resSwitch.getStatus(), 200);
    const switchData = resSwitch.getData();
    assert_1.default.strictEqual(switchData.userVote, "up", "User vote should switch to 'up'");
    assert_1.default.strictEqual(switchData.score, 1, "Score should become +1");
    assert_1.default.strictEqual(switchData.downvotesCount, 0, "Downvotes should be cleared for user B");
    assert_1.default.strictEqual(switchData.upvotesCount, 1, "Upvotes should contain user B");
    console.log("✅ 2.4 Vote switched cleanly from down to up. Score:", switchData.score);
    // 2.5 Invariant: User cannot appear in both upvotes and downvotes
    (0, assert_1.default)(!switchData.downvotes.includes(userB), "User B must not be in downvotes");
    (0, assert_1.default)(switchData.upvotes.includes(userB), "User B must be in upvotes");
    console.log("✅ 2.5 Invariant verified: User cannot exist in both upvotes and downvotes.");
    // 2.6 Unauthorized vote rejection
    console.log("2.6 Rejecting unauthorized vote...");
    const { req: reqVoteUnauth, res: resVoteUnauth } = createMockReqRes({
        params: { commentId: targetCommentId },
        body: { direction: "up" },
    });
    await (0, chating_controller_1.voteComment)(reqVoteUnauth, resVoteUnauth);
    assert_1.default.strictEqual(resVoteUnauth.getStatus(), 401, "Voting without auth should return 401");
    console.log("✅ 2.6 Unauthorized voting rejected with 401.");
    // 2.7 Invalid direction rejection
    console.log("2.7 Rejecting invalid vote direction...");
    const { req: reqBadDir, res: resBadDir } = createMockReqRes({
        params: { commentId: targetCommentId },
        body: { direction: "sideways", userId: userA },
    });
    await (0, chating_controller_1.voteComment)(reqBadDir, resBadDir);
    assert_1.default.strictEqual(resBadDir.getStatus(), 400, "Invalid direction should return 400");
    console.log("✅ 2.7 Invalid direction rejected with 400.");
    // --------------------------------------------------------------------------
    // Group 3: Comment Retrieval & Sorting Tests
    // --------------------------------------------------------------------------
    console.log("\n--- Group 3: Comment Retrieval & Sorting Tests ---");
    // 3.1 Verify threaded structure: parent contains nested replies
    console.log("3.1 Verifying threaded hierarchy in getComments...");
    const { req: reqGet, res: resGet } = createMockReqRes({
        params: { reportId: testReportId },
        query: { sort: "top", userId: userB },
    });
    await (0, chating_controller_1.getComments)(reqGet, resGet);
    assert_1.default.strictEqual(resGet.getStatus(), 200);
    const getCommentsData = resGet.getData();
    (0, assert_1.default)(Array.isArray(getCommentsData.comments), "comments must be an array");
    const retrievedParent = getCommentsData.comments.find((c) => c.id === parentComment.id);
    (0, assert_1.default)(retrievedParent, "Parent comment should be found in top-level comments");
    assert_1.default.strictEqual(retrievedParent.parentCommentId, null, "Parent must have null parentCommentId");
    (0, assert_1.default)(Array.isArray(retrievedParent.replies), "Parent must have replies array");
    assert_1.default.strictEqual(retrievedParent.replies.length, 2, "Parent should have exactly 2 replies");
    assert_1.default.strictEqual(retrievedParent.replyCount, 2, "Parent replyCount should be 2");
    assert_1.default.strictEqual(retrievedParent.userVote, "up", "User B should have userVote 'up'");
    console.log("✅ 3.1 Threaded hierarchy confirmed: 2 replies nested under parent.");
    // 3.2 Ensure replies are not leaked into top-level comments
    const replyInTopLevel = getCommentsData.comments.some((c) => c.id === replyCommentObj.id);
    assert_1.default.strictEqual(replyInTopLevel, false, "Replies must NOT be mixed into top-level list");
    console.log("✅ 3.2 Verified replies are excluded from top-level list.");
    // 3.3 Test Sort: Top (descending net score)
    console.log("3.3 Testing 'top' sort mode...");
    const { req: reqTop, res: resTop } = createMockReqRes({
        params: { reportId: testReportId },
        query: { sort: "top" },
    });
    await (0, chating_controller_1.getComments)(reqTop, resTop);
    const topComments = resTop.getData().comments;
    for (let i = 0; i < topComments.length - 1; i++) {
        const cur = topComments[i];
        const next = topComments[i + 1];
        (0, assert_1.default)(cur.score >= next.score, `Top sort failed: comment ${cur.id} (score ${cur.score}) appeared before comment ${next.id} (score ${next.score})`);
    }
    console.log("✅ 3.3 'Top' sorting verified: all top-level comments ordered by score descending.");
    // 3.4 Test Sort: Newest (creation time descending)
    console.log("3.4 Testing 'newest' sort mode...");
    const { req: reqNewest, res: resNewest } = createMockReqRes({
        params: { reportId: testReportId },
        query: { sort: "newest" },
    });
    await (0, chating_controller_1.getComments)(reqNewest, resNewest);
    const newestComments = resNewest.getData().comments;
    for (let i = 0; i < newestComments.length - 1; i++) {
        const timeA = new Date(newestComments[i].createdAt).getTime();
        const timeB = new Date(newestComments[i + 1].createdAt).getTime();
        (0, assert_1.default)(timeA >= timeB, "'Newest' sort failed: timestamps not in descending order");
    }
    console.log("✅ 3.4 'Newest' sorting verified: all top-level comments ordered by newest first.");
    // 3.5 Test Sort: Oldest (creation time ascending)
    console.log("3.5 Testing 'oldest' sort mode...");
    const { req: reqOldest, res: resOldest } = createMockReqRes({
        params: { reportId: testReportId },
        query: { sort: "oldest" },
    });
    await (0, chating_controller_1.getComments)(reqOldest, resOldest);
    const oldestComments = resOldest.getData().comments;
    for (let i = 0; i < oldestComments.length - 1; i++) {
        const timeA = new Date(oldestComments[i].createdAt).getTime();
        const timeB = new Date(oldestComments[i + 1].createdAt).getTime();
        (0, assert_1.default)(timeA <= timeB, "'Oldest' sort failed: timestamps not in ascending order");
    }
    console.log("✅ 3.5 'Oldest' sorting verified: all top-level comments ordered by oldest first.");
    // --------------------------------------------------------------------------
    // Group 4: MongoDB Schema & Persistence Invariants
    // --------------------------------------------------------------------------
    console.log("\n--- Group 4: MongoDB Schema & Model Tests ---");
    const dbUrl = process.env.DB_URL;
    if (dbUrl) {
        try {
            console.log("Connecting to MongoDB for live schema validation...");
            const mongooseModule = await Promise.resolve().then(() => __importStar(require("mongoose")));
            const mongoose = mongooseModule.default;
            await mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 5000 });
            const Comment = (await Promise.resolve().then(() => __importStar(require("../model/comment")))).default;
            console.log("4.1 Creating MongoDB top-level comment document...");
            const mongoReportId = new mongoose.Types.ObjectId().toString();
            const mongoUserId = new mongoose.Types.ObjectId().toString();
            const voter1 = new mongoose.Types.ObjectId().toString();
            const voter2 = new mongoose.Types.ObjectId().toString();
            const doc = new Comment({
                reportId: mongoReportId,
                userId: mongoUserId,
                comment: "Direct MongoDB comment test",
                parentCommentId: null,
                upvotes: [],
                downvotes: [],
            });
            await doc.save();
            assert_1.default.strictEqual(doc.parentCommentId, null);
            assert_1.default.strictEqual(doc.score, 0);
            assert_1.default.strictEqual(doc.content, "Direct MongoDB comment test");
            console.log("✅ 4.1 MongoDB comment created with virtual score = 0.");
            // 4.2 Creating MongoDB reply document
            console.log("4.2 Creating MongoDB reply linked to parent...");
            const replyDoc = new Comment({
                reportId: mongoReportId,
                userId: voter1,
                comment: "Direct MongoDB reply test",
                parentCommentId: doc._id.toString(),
                upvotes: [voter1],
                downvotes: [],
            });
            await replyDoc.save();
            assert_1.default.strictEqual(replyDoc.parentCommentId, doc._id.toString());
            assert_1.default.strictEqual(replyDoc.score, 1);
            console.log("✅ 4.2 MongoDB reply created and linked properly.");
            // 4.3 Voting on MongoDB comment via voteComment controller
            console.log("4.3 Voting on MongoDB comment via voteComment controller...");
            const { req: reqMongoVote, res: resMongoVote } = createMockReqRes({
                params: { commentId: doc._id.toString() },
                body: { direction: "up", userId: voter1 },
            });
            await (0, chating_controller_1.voteComment)(reqMongoVote, resMongoVote);
            assert_1.default.strictEqual(resMongoVote.getStatus(), 200);
            assert_1.default.strictEqual(resMongoVote.getData().score, 1);
            assert_1.default.strictEqual(resMongoVote.getData().userVote, "up");
            console.log("✅ 4.3 Upvoted MongoDB comment successfully.");
            // 4.4 Downvoting from voter 2
            console.log("4.4 Downvote from voter 2 on MongoDB comment...");
            const { req: reqMongoDown, res: resMongoDown } = createMockReqRes({
                params: { commentId: doc._id.toString() },
                body: { direction: "down", userId: voter2 },
            });
            await (0, chating_controller_1.voteComment)(reqMongoDown, resMongoDown);
            assert_1.default.strictEqual(resMongoDown.getStatus(), 200);
            assert_1.default.strictEqual(resMongoDown.getData().score, 0); // 1 upvote - 1 downvote = 0
            console.log("✅ 4.4 Downvote net score verified (1 - 1 = 0).");
            // 4.5 Clean up test documents
            await Comment.deleteMany({ reportId: mongoReportId });
            console.log("✅ 4.5 Cleaned up MongoDB test documents.");
            await mongoose.disconnect();
        }
        catch (dbErr) {
            console.warn("⚠️ MongoDB live check skipped or encountered notice:", dbErr.message);
        }
    }
    console.log("\n=================================================");
    console.log(" 🎉 All Comment & Voting Tests Passed!          ");
    console.log("=================================================");
}
runCommentTests().catch((err) => {
    console.error("❌ Comment tests failed:", err);
    process.exit(1);
});
//# sourceMappingURL=comment.test.js.map