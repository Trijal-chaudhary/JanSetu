import express from "express";
import {
  collectingInfo,
  getReports,
  reportManual,
  uploadingEvedince,
} from "../controllers/chating.controller";
import { upload } from "../config/multer.config";

const collectingInfoRouter = express.Router();
const uploadingEvedinceRouter = express.Router();
const reportManualRouter = express.Router();
const getReportsRouter = express.Router();

collectingInfoRouter.post("/", collectingInfo);
uploadingEvedinceRouter.post("/", upload.any(), uploadingEvedince);
reportManualRouter.post("/", reportManual);
getReportsRouter.get("/", getReports);

export {
  collectingInfoRouter,
  uploadingEvedinceRouter,
  reportManualRouter,
  getReportsRouter,
};
