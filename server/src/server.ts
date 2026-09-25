import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import {
  collectingInfoRouter,
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
const PORT = 3007;
app.listen(PORT, () => {
  console.log(`http://localhost/${PORT}`);
});
