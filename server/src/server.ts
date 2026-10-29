import dotenv from "dotenv";
import path from "path";
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import { initSocketIO } from "./socket";
import authRouter from "./routers/auth.router";
import departRouter from "./routers/depart.router";
import {
  collectingInfoRouter,
  getReportsRouter,
  getUsersRouter,
  reportsRouter,
  reportManualRouter,
  uploadingEvedinceRouter,
  notificationsRouter,
} from "./routers/user.router";

const app = express();
const server = http.createServer(app);
const PORT = 3007;
const DB_URL = process.env.DB_URL;

if (!DB_URL) {
  throw new Error("DB_URL is not defined in .env");
}

initSocketIO(server);

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5175",
      'http://192.168.0.199:5173'
    ],
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "jansetu_civic_secret_key_2024",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: DB_URL,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: false, // false for HTTP on localhost
      sameSite: "lax",
    },
  })
);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/data/images", express.static(path.join(process.cwd(), "src/data/images")));

app.use("/api/auth", authRouter);
app.use("/api/depart", departRouter);
app.use("/api/collectingInfo", collectingInfoRouter);
app.use("/api/uploadingEvedince", uploadingEvedinceRouter);
app.use("/api/manual_report", reportManualRouter);
app.use("/api/getReports", getReportsRouter);
app.use("/api/getUsers", getUsersRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/notifications", notificationsRouter);

mongoose.connect(DB_URL).then(() => {
  console.log("connected to mongoose");
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
});
