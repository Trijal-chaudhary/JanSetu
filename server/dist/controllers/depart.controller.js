"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReportStatus = exports.getDepartmentReports = exports.logoutDepartment = exports.getDepartmentSession = exports.loginDepartment = void 0;
exports.calculateDistanceKm = calculateDistanceKm;
const departUsers_json_1 = __importDefault(require("../data/departUsers.json"));
const departmentData_json_1 = __importDefault(require("../data/departmentData.json"));
const report_1 = __importDefault(require("../model/report"));
const comment_1 = __importDefault(require("../model/comment"));
const notification_1 = __importDefault(require("../model/notification"));
const socket_1 = require("../socket");
const chating_controller_1 = require("./chating.controller");
const pythonService_1 = require("../services/pythonService");
/**
 * Calculates distance between two geographical points using the Haversine formula (in KM)
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in KM
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
const getDepartments = () => {
    return departmentData_json_1.default || departUsers_json_1.default.departments || [];
};
const loginDepartment = async (req, res) => {
    try {
        const { username, password, category } = req.body;
        if (!username || !password || !category) {
            return res.status(400).json({
                success: false,
                message: "Username, password, and category selection are required.",
            });
        }
        const departments = getDepartments();
        const dept = departments.find((d) => d.username.toLowerCase() === username.trim().toLowerCase() &&
            d.password === password &&
            d.category === category);
        if (!dept) {
            return res.status(401).json({
                success: false,
                message: "Invalid department credentials or category selection.",
            });
        }
        req.session.departId = dept.departmentId;
        return res.status(200).json({
            success: true,
            department: {
                departmentId: dept.departmentId,
                departmentName: dept.departmentName,
                category: dept.category,
                subcategories: dept.subcategories,
                username: dept.username,
                location: dept.location,
            },
        });
    }
    catch (error) {
        console.error("Department login error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred during department login.",
        });
    }
};
exports.loginDepartment = loginDepartment;
const getDepartmentSession = async (req, res) => {
    try {
        const departId = req.session?.departId;
        if (!departId) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated as a department authority.",
            });
        }
        const departments = getDepartments();
        const dept = departments.find((d) => d.departmentId === departId);
        if (!dept) {
            return res.status(401).json({
                success: false,
                message: "Department session invalid.",
            });
        }
        return res.status(200).json({
            success: true,
            department: {
                departmentId: dept.departmentId,
                departmentName: dept.departmentName,
                category: dept.category,
                subcategories: dept.subcategories,
                username: dept.username,
                location: dept.location,
            },
        });
    }
    catch (error) {
        console.error("Get department session error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve department session.",
        });
    }
};
exports.getDepartmentSession = getDepartmentSession;
const logoutDepartment = async (req, res) => {
    try {
        if (req.session) {
            delete req.session.departId;
        }
        return res.status(200).json({
            success: true,
            message: "Department session logged out successfully.",
        });
    }
    catch (error) {
        console.error("Department logout error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to logout department session.",
        });
    }
};
exports.logoutDepartment = logoutDepartment;
const getDepartmentReports = async (req, res) => {
    try {
        const departId = req.session?.departId;
        if (!departId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized department access.",
            });
        }
        const departments = getDepartments();
        const dept = departments.find((d) => d.departmentId === departId);
        if (!dept) {
            return res.status(401).json({
                success: false,
                message: "Department identity not recognized.",
            });
        }
        const isPublicInfra = dept.category.toLowerCase() === "public infrastructure";
        const deptLat = dept.location?.latitude;
        const deptLng = dept.location?.longitude;
        const serviceRadiusKm = dept.location?.radiusKm ?? dept.location?.radius ?? 10;
        // Helper filter to enforce strict category, subcategory & distance rule
        const isReportAuthorized = (r) => {
            // 1. Category check
            if (r.category !== dept.category)
                return false;
            // 2. Subcategory check
            const subcatMatch = dept.subcategories.some((sc) => sc.toLowerCase() === (r.subcategory || "").toLowerCase());
            if (!subcatMatch)
                return false;
            // 3. For Public Infrastructure, enforce 10 KM location service radius check on server
            if (isPublicInfra) {
                if (typeof deptLat !== "number" || typeof deptLng !== "number") {
                    return true; // Fallback if department location is unspecified
                }
                const reportLat = parseFloat(r.location?.latitude);
                const reportLng = parseFloat(r.location?.longitude);
                if (isNaN(reportLat) || isNaN(reportLng)) {
                    return false; // Reports without valid coordinates are excluded from location-restricted views
                }
                const distanceKm = calculateDistanceKm(deptLat, deptLng, reportLat, reportLng);
                return distanceKm <= serviceRadiusKm;
            }
            return true;
        };
        // Fetch MongoDB reports
        const mongoReports = await report_1.default
            .find({
            category: dept.category,
        })
            .sort({ createdAt: -1 });
        const mongoCommentCounts = {};
        const allMongoComments = await comment_1.default.find({}).lean();
        allMongoComments.forEach((c) => {
            const rid = c.reportId?.toString();
            if (rid) {
                mongoCommentCounts[rid] = (mongoCommentCounts[rid] || 0) + 1;
            }
        });
        const filteredDummy = chating_controller_1.runtimeDummyReports.filter((r) => isReportAuthorized(r));
        const filteredMongo = mongoReports.filter((r) => isReportAuthorized(r));
        const combinedReports = [...filteredMongo, ...filteredDummy];
        const reports = combinedReports.map((r) => {
            const reportObj = typeof r.toObject === "function" ? r.toObject() : { ...r };
            const reportId = (reportObj._id || reportObj.id || "").toString();
            const dummyCommentCount = chating_controller_1.runtimeDummyComments.filter((c) => (c.reportId || "").toString() === reportId).length;
            const mongoCount = mongoCommentCounts[reportId] || 0;
            const commentCount = dummyCommentCount + mongoCount;
            let distanceKm = null;
            if (isPublicInfra &&
                typeof deptLat === "number" &&
                typeof deptLng === "number" &&
                reportObj.location?.latitude != null &&
                reportObj.location?.longitude != null) {
                const rLat = parseFloat(reportObj.location.latitude);
                const rLng = parseFloat(reportObj.location.longitude);
                if (!isNaN(rLat) && !isNaN(rLng)) {
                    distanceKm = Math.round(calculateDistanceKm(deptLat, deptLng, rLat, rLng) * 10) / 10;
                }
            }
            return {
                ...reportObj,
                commentCount,
                distanceKm,
            };
        });
        return res.status(200).json({
            success: true,
            department: {
                departmentId: dept.departmentId,
                departmentName: dept.departmentName,
                category: dept.category,
                subcategories: dept.subcategories,
                username: dept.username,
                location: dept.location,
            },
            reports,
        });
    }
    catch (error) {
        console.error("Get department reports error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch department reports.",
        });
    }
};
exports.getDepartmentReports = getDepartmentReports;
const updateReportStatus = async (req, res) => {
    try {
        const departId = req.session?.departId;
        if (!departId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized department access.",
            });
        }
        const departments = getDepartments();
        const dept = departments.find((d) => d.departmentId === departId);
        if (!dept) {
            return res.status(401).json({
                success: false,
                message: "Department identity not recognized.",
            });
        }
        const { reportId } = req.params;
        const { applicationStatus, resolutionRemark, resolutionEvidence } = req.body;
        if (!applicationStatus) {
            return res.status(400).json({
                success: false,
                message: "Application status is required.",
            });
        }
        // Require resolutionRemark if target status is Resolved
        if (applicationStatus === "Resolved" &&
            (!resolutionRemark || typeof resolutionRemark !== "string" || !resolutionRemark.trim())) {
            return res.status(400).json({
                success: false,
                message: "Resolution remark is required when marking a report as resolved.",
            });
        }
        const isPublicInfra = dept.category.toLowerCase() === "public infrastructure";
        const deptLat = dept.location?.latitude;
        const deptLng = dept.location?.longitude;
        const serviceRadiusKm = dept.location?.radiusKm ?? dept.location?.radius ?? 10;
        let targetReport = null;
        let isMongo = false;
        // Check MongoDB
        const idStr = Array.isArray(reportId) ? reportId[0] : reportId;
        if (typeof idStr === "string" && idStr.match(/^[0-9a-fA-F]{24}$/)) {
            const mongoReport = await report_1.default.findById(idStr);
            if (mongoReport) {
                targetReport = mongoReport;
                isMongo = true;
            }
        }
        // Check Dummy reports if not found in MongoDB
        if (!targetReport) {
            const dummyReport = chating_controller_1.runtimeDummyReports.find((r) => r._id === reportId || r.id === reportId);
            if (dummyReport) {
                targetReport = dummyReport;
            }
        }
        if (!targetReport) {
            return res.status(404).json({
                success: false,
                message: "Report not found.",
            });
        }
        // 1. Authorization Check: Category matching
        if (targetReport.category !== dept.category) {
            return res.status(403).json({
                success: false,
                message: "Report does not belong to your authorized department category.",
            });
        }
        // 2. Authorization Check: Public Infrastructure 10 KM Radius
        if (isPublicInfra && typeof deptLat === "number" && typeof deptLng === "number") {
            const reportLat = parseFloat(targetReport.location?.latitude);
            const reportLng = parseFloat(targetReport.location?.longitude);
            if (isNaN(reportLat) || isNaN(reportLng)) {
                return res.status(403).json({
                    success: false,
                    message: "Report lacks valid geographic coordinates and cannot be modified by location-restricted authorities.",
                });
            }
            const distKm = calculateDistanceKm(deptLat, deptLng, reportLat, reportLng);
            if (distKm > serviceRadiusKm) {
                return res.status(403).json({
                    success: false,
                    message: `Unauthorized action: Report location (${distKm.toFixed(1)} km away) exceeds your department's ${serviceRadiusKm} KM service radius.`,
                });
            }
        }
        const currentStatus = targetReport.applicationStatus || "Reported";
        // 3. Status Transition Rules Validation
        if (currentStatus === "Closed") {
            return res.status(400).json({
                success: false,
                message: "Report is closed and confirmed by citizen. It cannot be modified directly.",
            });
        }
        // Initialize activity history if missing
        if (!Array.isArray(targetReport.activityHistory)) {
            targetReport.activityHistory = [];
        }
        if (targetReport.activityHistory.length === 0) {
            targetReport.activityHistory.push({
                action: "Report Created",
                previousStatus: null,
                newStatus: currentStatus,
                remark: null,
                performedBy: targetReport.createdBy || "Citizen Resident",
                performedByType: "citizen",
                createdAt: targetReport.createdAt || new Date().toISOString(),
            });
        }
        // Record activity history entry
        const historyEntry = {
            action: `Status changed to ${applicationStatus}`,
            previousStatus: currentStatus,
            newStatus: applicationStatus,
            remark: resolutionRemark || null,
            performedBy: dept.departmentName,
            performedByType: "department",
            createdAt: new Date().toISOString(),
        };
        targetReport.activityHistory.push(historyEntry);
        targetReport.applicationStatus = applicationStatus;
        targetReport.updatedAt = new Date().toISOString();
        if (applicationStatus === "Resolved") {
            targetReport.resolutionRemark = resolutionRemark;
            if (Array.isArray(resolutionEvidence)) {
                targetReport.resolutionEvidence = resolutionEvidence;
            }
            targetReport.resolutionDate = new Date().toISOString();
        }
        // Save update
        if (isMongo) {
            const doc = await report_1.default.findById(targetReport._id);
            if (doc) {
                doc.applicationStatus = applicationStatus;
                if (applicationStatus === "Resolved") {
                    doc.resolutionRemark = resolutionRemark;
                    if (Array.isArray(resolutionEvidence)) {
                        doc.resolutionEvidence = resolutionEvidence;
                    }
                    doc.resolutionDate = new Date();
                }
                doc.activityHistory = targetReport.activityHistory;
                await doc.save();
                targetReport = doc.toObject();
            }
        }
        // Sync with vector index: If resolved, remove from semantic clustering search index
        if (applicationStatus === "Resolved") {
            pythonService_1.pythonService.removeReport(idStr).catch((err) => {
                console.warn("Vector removal on resolution warning:", err.message);
            });
        }
        // Send Real-time Socket.IO notification to citizen creator
        const creatorId = targetReport.createdBy || targetReport.userId;
        if (creatorId) {
            try {
                const notifDoc = new notification_1.default({
                    recipientId: creatorId,
                    recipientType: "user",
                    reportId: (targetReport._id || targetReport.id || "").toString(),
                    title: "Grievance Status Update",
                    message: `Your grievance "${targetReport.subcategory || targetReport.category}" status has been updated to "${applicationStatus}".`,
                    type: "status_update",
                });
                await notifDoc.save();
                const io = (0, socket_1.getIO)();
                if (io) {
                    const payload = {
                        notificationId: notifDoc._id.toString(),
                        reportId: notifDoc.reportId,
                        title: notifDoc.title,
                        message: notifDoc.message,
                        type: notifDoc.type,
                        createdAt: notifDoc.createdAt,
                        read: false,
                    };
                    io.to(`user:${creatorId}`).emit("notification", payload);
                    io.to(`user:${creatorId}`).emit("report_updated", targetReport);
                }
            }
            catch (notifErr) {
                console.error("Failed to deliver notification:", notifErr);
            }
        }
        return res.status(200).json({
            success: true,
            message: "Report status updated successfully.",
            report: targetReport,
        });
    }
    catch (error) {
        console.error("Update report status error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update report status.",
        });
    }
};
exports.updateReportStatus = updateReportStatus;
//# sourceMappingURL=depart.controller.js.map