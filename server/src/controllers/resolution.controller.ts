import { Request, Response } from "express";
import reportDetails from "../model/report";
import Notification from "../model/notification";
import User from "../model/user";
import { getIO } from "../socket";
import { runtimeDummyReports, runtimeDummyUsers } from "./chating.controller";

export const confirmResolution = async (req: Request, res: Response) => {
  try {
    const sessionUserId = (req.session as any)?.userId;
    const { reportId } = req.params;

    if (!sessionUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to confirm resolution.",
      });
    }

    let targetReport: any = null;
    let isMongo = false;

    const idStr = Array.isArray(reportId) ? reportId[0] : reportId;

    if (typeof idStr === "string" && idStr.match(/^[0-9a-fA-F]{24}$/)) {
      const mongoR = await reportDetails.findById(reportId);
      if (mongoR) {
        targetReport = mongoR;
        isMongo = true;
      }
    }

    if (!targetReport) {
      targetReport = runtimeDummyReports.find(
        (r) => r._id === reportId || r.id === reportId
      );
    }

    if (!targetReport) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    // Owner check
    const ownerId = targetReport.createdBy || targetReport.userId;
    if (ownerId && ownerId !== sessionUserId) {
      return res.status(403).json({
        success: false,
        message: "Only the citizen creator of this grievance can confirm resolution.",
      });
    }

    if (targetReport.applicationStatus !== "Resolved") {
      return res.status(400).json({
        success: false,
        message: `Report cannot be closed because current status is '${targetReport.applicationStatus}'. It must be 'Resolved'.`,
      });
    }

    // Fetch user name
    let userName = "Citizen Resident";
    const dummyU = runtimeDummyUsers.find((u) => u.id === sessionUserId || u.username === sessionUserId);
    if (dummyU) {
      userName = dummyU.name;
    } else {
      const mongoU = await User.findById(sessionUserId).lean();
      if (mongoU) userName = mongoU.name;
    }

    if (!Array.isArray(targetReport.activityHistory)) {
      targetReport.activityHistory = [];
    }

    const historyEntry = {
      action: "Citizen confirmed resolution",
      previousStatus: "Resolved",
      newStatus: "Closed",
      remark: "Citizen verified that the issue has been successfully resolved.",
      performedBy: userName,
      performedByType: "citizen",
      createdAt: new Date().toISOString(),
    };

    targetReport.activityHistory.push(historyEntry);
    targetReport.applicationStatus = "Closed";
    targetReport.updatedAt = new Date().toISOString();

    if (isMongo) {
      const doc = await reportDetails.findById(targetReport._id);
      if (doc) {
        doc.applicationStatus = "Closed";
        doc.activityHistory = targetReport.activityHistory;
        await doc.save();
        targetReport = doc.toObject();
      }
    }

    // Emit Socket.IO notification to category/department
    const io = getIO();
    if (io) {
      io.emit("report_updated", targetReport);
      io.emit("department_notification", {
        reportId: (targetReport._id || targetReport.id || "").toString(),
        title: "Grievance Closed by Citizen",
        message: `Citizen verified and closed grievance #${(targetReport._id || targetReport.id || "").toString().slice(-6)}.`,
        category: targetReport.category,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Grievance confirmed as resolved and closed successfully.",
      report: targetReport,
    });
  } catch (error) {
    console.error("confirmResolution error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to confirm grievance resolution.",
    });
  }
};

export const reopenReport = async (req: Request, res: Response) => {
  try {
    const sessionUserId = (req.session as any)?.userId;
    const { reportId } = req.params;
    const { remark } = req.body;

    if (!sessionUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to reopen report.",
      });
    }

    let targetReport: any = null;
    let isMongo = false;

    const idStr = Array.isArray(reportId) ? reportId[0] : reportId;

    if (typeof idStr === "string" && idStr.match(/^[0-9a-fA-F]{24}$/)) {
      const mongoR = await reportDetails.findById(reportId);
      if (mongoR) {
        targetReport = mongoR;
        isMongo = true;
      }
    }

    if (!targetReport) {
      targetReport = runtimeDummyReports.find(
        (r) => r._id === reportId || r.id === reportId
      );
    }

    if (!targetReport) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    // Owner check
    const ownerId = targetReport.createdBy || targetReport.userId;
    if (ownerId && ownerId !== sessionUserId) {
      return res.status(403).json({
        success: false,
        message: "Only the citizen creator of this grievance can reopen it.",
      });
    }

    if (targetReport.applicationStatus !== "Resolved") {
      return res.status(400).json({
        success: false,
        message: `Report cannot be reopened because current status is '${targetReport.applicationStatus}'. It must be 'Resolved'.`,
      });
    }

    let userName = "Citizen Resident";
    const dummyU = runtimeDummyUsers.find((u) => u.id === sessionUserId || u.username === sessionUserId);
    if (dummyU) {
      userName = dummyU.name;
    } else {
      const mongoU = await User.findById(sessionUserId).lean();
      if (mongoU) userName = mongoU.name;
    }

    if (!Array.isArray(targetReport.activityHistory)) {
      targetReport.activityHistory = [];
    }

    const historyEntry = {
      action: "Citizen reopened report",
      previousStatus: "Resolved",
      newStatus: "Reopened",
      remark: remark || "Issue still exists and requires further authority action.",
      performedBy: userName,
      performedByType: "citizen",
      createdAt: new Date().toISOString(),
    };

    targetReport.activityHistory.push(historyEntry);
    targetReport.applicationStatus = "Reopened";
    targetReport.updatedAt = new Date().toISOString();

    if (isMongo) {
      const doc = await reportDetails.findById(targetReport._id);
      if (doc) {
        doc.applicationStatus = "Reopened";
        doc.activityHistory = targetReport.activityHistory;
        await doc.save();
        targetReport = doc.toObject();
      }
    }

    // Emit Real-time Socket.IO notification to authority departments
    const io = getIO();
    if (io) {
      io.emit("report_updated", targetReport);
      io.emit("department_notification", {
        reportId: (targetReport._id || targetReport.id || "").toString(),
        title: "Grievance Reopened by Citizen",
        message: `Grievance #${(targetReport._id || targetReport.id || "").toString().slice(-6)} has been reopened by citizen. Reason: ${remark || "Issue still exists"}`,
        category: targetReport.category,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Grievance reopened successfully.",
      report: targetReport,
    });
  } catch (error) {
    console.error("reopenReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reopen report.",
    });
  }
};

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    const departId = (req.session as any)?.departId;

    let recipientId = userId || departId;
    let recipientType = userId ? "user" : departId ? "department" : null;

    if (!recipientId && req.query.userId) {
      recipientId = req.query.userId as string;
      recipientType = "user";
    }

    if (!recipientId) {
      return res.status(200).json({
        success: true,
        notifications: [],
      });
    }

    const query: any = { recipientId };
    if (recipientType) {
      query.recipientType = recipientType;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    await Notification.findByIdAndUpdate(notificationId, { read: true });
    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error) {
    console.error("markNotificationRead error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification.",
    });
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    const departId = (req.session as any)?.departId;
    let recipientId = userId || departId || (req.body.userId as string);

    if (recipientId) {
      await Notification.updateMany({ recipientId }, { read: true });
    }

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    console.error("markAllNotificationsRead error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notifications.",
    });
  }
};
