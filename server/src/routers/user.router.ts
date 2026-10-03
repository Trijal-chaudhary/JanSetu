import express from "express";
import {
  collectingInfo,
  reportManual,
  uploadingEvedince,
} from "../controllers/chating.controller";
import { upload } from "../config/multer.config";

const collectingInfoRouter = express.Router();
const uploadingEvedinceRouter = express.Router();
const reportManualRouter = express.Router();

collectingInfoRouter.post("/", collectingInfo);
uploadingEvedinceRouter.post("/", upload.any(), uploadingEvedince);
reportManualRouter.post("/", reportManual);

export { collectingInfoRouter, uploadingEvedinceRouter, reportManualRouter };
