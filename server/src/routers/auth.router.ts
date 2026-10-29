import express from "express";
import { signup, login, getMe, logout, updateProfile } from "../controllers/auth.controller";
import { upload } from "../config/multer.config";
import { requireAuth } from "../middlewares/auth.middleware";

const authRouter = express.Router();

authRouter.post("/signup", upload.single("profilePhoto"), signup);
authRouter.post("/login", login);
authRouter.get("/me", getMe);
authRouter.post("/logout", logout);
authRouter.put("/profile", requireAuth, upload.single("profilePhoto"), updateProfile);
authRouter.post("/profile", requireAuth, upload.single("profilePhoto"), updateProfile);

export default authRouter;


