import express from "express";
import {
  collectingInfo,
  getReports,
  getReportById,
  getUsers,
  toggleSupport,
  getComments,
  addComment,
  replyComment,
  voteComment,
  likeComment,
  reportManual,
  uploadingEvedince,
  checkSimilarReports,
} from "../controllers/chating.controller";
import {
  confirmResolution,
  reopenReport,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/resolution.controller";
import {
  saveOrUpdateDraft,
  getDraft,
  classifyDraft,
  checkDraftSimilar,
  finalizeDraftSubmission,
} from "../controllers/classification.controller";
import { upload } from "../config/multer.config";

const collectingInfoRouter = express.Router();
const uploadingEvedinceRouter = express.Router();
const reportManualRouter = express.Router();
const getReportsRouter = express.Router();
const getUsersRouter = express.Router();
const reportsRouter = express.Router();
const notificationsRouter = express.Router();

collectingInfoRouter.post("/", collectingInfo);
uploadingEvedinceRouter.post("/", upload.any(), uploadingEvedince);
reportManualRouter.post("/", reportManual);
getReportsRouter.get("/", getReports);
getUsersRouter.get("/", getUsers);

// Draft & Sensitivity Classification Pipeline routes (before :reportId)
reportsRouter.post("/draft", saveOrUpdateDraft);
reportsRouter.get("/draft/:draftId", getDraft);
reportsRouter.post("/draft/:draftId/classify", classifyDraft);
reportsRouter.get("/draft/:draftId/check-similar", checkDraftSimilar);
reportsRouter.post("/draft/:draftId/submit", finalizeDraftSubmission);

reportsRouter.post("/check-similar", checkSimilarReports);
reportsRouter.get("/:reportId", getReportById);
reportsRouter.post("/:reportId/support", toggleSupport);
reportsRouter.get("/:reportId/comments", getComments);
reportsRouter.post("/:reportId/comments", addComment);
reportsRouter.post("/:reportId/comments/:commentId/reply", replyComment);
reportsRouter.post("/comments/:commentId/vote", voteComment);
reportsRouter.post("/comments/:commentId/like", likeComment);
reportsRouter.post("/:reportId/confirm-resolution", confirmResolution);
reportsRouter.post("/:reportId/reopen", reopenReport);

notificationsRouter.get("/", getNotifications);
notificationsRouter.put("/read-all", markAllNotificationsRead);
notificationsRouter.put("/:notificationId/read", markNotificationRead);

export {
  collectingInfoRouter,
  uploadingEvedinceRouter,
  reportManualRouter,
  getReportsRouter,
  getUsersRouter,
  reportsRouter,
  notificationsRouter,
};
