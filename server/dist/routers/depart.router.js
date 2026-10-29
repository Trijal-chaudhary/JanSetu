"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const depart_controller_1 = require("../controllers/depart.controller");
const departRouter = express_1.default.Router();
departRouter.post("/auth/login", depart_controller_1.loginDepartment);
departRouter.get("/auth/me", depart_controller_1.getDepartmentSession);
departRouter.post("/auth/logout", depart_controller_1.logoutDepartment);
departRouter.get("/reports", depart_controller_1.getDepartmentReports);
departRouter.put("/reports/:reportId/status", depart_controller_1.updateReportStatus);
exports.default = departRouter;
//# sourceMappingURL=depart.router.js.map