"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsRead = exports.markNotificationRead = exports.getNotifications = exports.reopenReport = exports.confirmResolution = void 0;
const report_1 = __importDefault(require("../model/report"));
const notification_1 = __importDefault(require("../model/notification"));
const user_1 = __importDefault(require("../model/user"));
const socket_1 = require("../socket");
const chating_controller_1 = require("./chating.controller");
const confirmResolution = async (req, res) => {
    try {
        const sessionUserId = req.session?.userId;
        const { reportId } = req.params;
        if (!sessionUserId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to confirm resolution.",
            });
        }
        let targetReport = null;
        let isMongo = false;
        const idStr = Array.isArray(reportId) ? reportId[0] : reportId;
        if (typeof idStr === "string" && idStr.match(/^[0-9a-fA-F]{24}$/)) {
            const mongoR = await report_1.default.findById(reportId);
            if (mongoR) {
                targetReport = mongoR;
                isMongo = true;
            }
        }
        if (!targetReport) {
            targetReport = chating_controller_1.runtimeDummyReports.find((r) => r._id === reportId || r.id === reportId);
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
        const dummyU = chating_controller_1.runtimeDummyUsers.find((u) => u.id === sessionUserId || u.username === sessionUserId);
        if (dummyU) {
            userName = dummyU.name;
        }
        else {
            const mongoU = await user_1.default.findById(sessionUserId).lean();
            if (mongoU)
                userName = mongoU.name;
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
            const doc = await report_1.default.findById(targetReport._id);
            if (doc) {
                doc.applicationStatus = "Closed";
                doc.activityHistory = targetReport.activityHistory;
                await doc.save();
                targetReport = doc.toObject();
            }
        }
        // Emit Socket.IO notification to category/department
        const io = (0, socket_1.getIO)();
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
    }
    catch (error) {
        console.error("confirmResolution error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to confirm grievance resolution.",
        });
    }
};
exports.confirmResolution = confirmResolution;
const reopenReport = async (req, res) => {
    try {
        const sessionUserId = req.session?.userId;
        const { reportId } = req.params;
        const { remark } = req.body;
        if (!sessionUserId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to reopen report.",
            });
        }
        let targetReport = null;
        let isMongo = false;
        const idStr = Array.isArray(reportId) ? reportId[0] : reportId;
        if (typeof idStr === "string" && idStr.match(/^[0-9a-fA-F]{24}$/)) {
            const mongoR = await report_1.default.findById(reportId);
            if (mongoR) {
                targetReport = mongoR;
                isMongo = true;
            }
        }
        if (!targetReport) {
            targetReport = chating_controller_1.runtimeDummyReports.find((r) => r._id === reportId || r.id === reportId);
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
        const dummyU = chating_controller_1.runtimeDummyUsers.find((u) => u.id === sessionUserId || u.username === sessionUserId);
        if (dummyU) {
            userName = dummyU.name;
        }
        else {
            const mongoU = await user_1.default.findById(sessionUserId).lean();
            if (mongoU)
                userName = mongoU.name;
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
            const doc = await report_1.default.findById(targetReport._id);
            if (doc) {
                doc.applicationStatus = "Reopened";
                doc.activityHistory = targetReport.activityHistory;
                await doc.save();
                targetReport = doc.toObject();
            }
        }
        // Emit Real-time Socket.IO notification to authority departments
        const io = (0, socket_1.getIO)();
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
    }
    catch (error) {
        console.error("reopenReport error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reopen report.",
        });
    }
};
exports.reopenReport = reopenReport;
const getNotifications = async (req, res) => {
    try {
        const userId = req.session?.userId;
        const departId = req.session?.departId;
        let recipientId = userId || departId;
        let recipientType = userId ? "user" : departId ? "department" : null;
        if (!recipientId && req.query.userId) {
            recipientId = req.query.userId;
            recipientType = "user";
        }
        if (!recipientId) {
            return res.status(200).json({
                success: true,
                notifications: [],
            });
        }
        const query = { recipientId };
        if (recipientType) {
            query.recipientType = recipientType;
        }
        const notifications = await notification_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();
        return res.status(200).json({
            success: true,
            notifications,
        });
    }
    catch (error) {
        console.error("getNotifications error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch notifications.",
        });
    }
};
exports.getNotifications = getNotifications;
const markNotificationRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        await notification_1.default.findByIdAndUpdate(notificationId, { read: true });
        return res.status(200).json({
            success: true,
            message: "Notification marked as read.",
        });
    }
    catch (error) {
        console.error("markNotificationRead error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update notification.",
        });
    }
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (req, res) => {
    try {
        const userId = req.session?.userId;
        const departId = req.session?.departId;
        let recipientId = userId || departId || req.body.userId;
        if (recipientId) {
            await notification_1.default.updateMany({ recipientId }, { read: true });
        }
        return res.status(200).json({
            success: true,
            message: "All notifications marked as read.",
        });
    }
    catch (error) {
        console.error("markAllNotificationsRead error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update notifications.",
        });
    }
};
exports.markAllNotificationsRead = markAllNotificationsRead;
//# sourceMappingURL=resolution.controller.js.map