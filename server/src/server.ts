import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import {
  collectingInfoRouter,
  reportManualRouter,
  uploadingEvedinceRouter,
} from "./routers/user.router";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use("/api/collectingInfo", collectingInfoRouter);
app.use("/api/uploadingEvedince", uploadingEvedinceRouter);
app.use("/api/manual_report", reportManualRouter);
const PORT = 3007;
// const DB_URL : string = process.env.DB_URL;
const DB_URL = process.env.DB_URL;

if (!DB_URL) {
  throw new Error("DB_URL is not defined in .env");
}
mongoose.connect(DB_URL).then(() => {
  console.log("connected to mongoose");
  app.listen(PORT, () => {
    console.log(`http://localhost/${PORT}`);
  });
});
