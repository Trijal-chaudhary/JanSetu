"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const multer_config_1 = require("../config/multer.config");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const authRouter = express_1.default.Router();
authRouter.post("/signup", multer_config_1.upload.single("profilePhoto"), auth_controller_1.signup);
authRouter.post("/login", auth_controller_1.login);
authRouter.get("/me", auth_controller_1.getMe);
authRouter.post("/logout", auth_controller_1.logout);
authRouter.put("/profile", auth_middleware_1.requireAuth, multer_config_1.upload.single("profilePhoto"), auth_controller_1.updateProfile);
authRouter.post("/profile", auth_middleware_1.requireAuth, multer_config_1.upload.single("profilePhoto"), auth_controller_1.updateProfile);
exports.default = authRouter;
//# sourceMappingURL=auth.router.js.map