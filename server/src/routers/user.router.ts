import express from "express";
import {
  collectingInfo,
  uploadingEvedince,
} from "../controllers/chating.controller";
import { upload } from "../config/multer.config";

const collectingInfoRouter = express.Router();
const uploadingEvedinceRouter = express.Router();

collectingInfoRouter.post("/", collectingInfo);
uploadingEvedinceRouter.post("/", upload.any(), uploadingEvedince);

export { collectingInfoRouter, uploadingEvedinceRouter };
