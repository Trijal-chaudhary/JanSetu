import express from "express";
import {
  loginDepartment,
  getDepartmentSession,
  logoutDepartment,
  getDepartmentReports,
  updateReportStatus,
} from "../controllers/depart.controller";

const departRouter = express.Router();

departRouter.post("/auth/login", loginDepartment);
departRouter.get("/auth/me", getDepartmentSession);
departRouter.post("/auth/logout", logoutDepartment);
departRouter.get("/reports", getDepartmentReports);
departRouter.put("/reports/:reportId/status", updateReportStatus);

export default departRouter;
