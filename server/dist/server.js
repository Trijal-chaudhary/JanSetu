"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), "server/.env") });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), ".env") });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const socket_1 = require("./socket");
const auth_router_1 = __importDefault(require("./routers/auth.router"));
const depart_router_1 = __importDefault(require("./routers/depart.router"));
const user_router_1 = require("./routers/user.router");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = 3007;
const DB_URL = process.env.DB_URL;
if (!DB_URL) {
    throw new Error("DB_URL is not defined in .env");
}
(0, socket_1.initSocketIO)(server);
app.use(express_1.default.json());
app.use((0, cors_1.default)({
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
}));
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "jansetu_civic_secret_key_2024",
    resave: false,
    saveUninitialized: false,
    store: connect_mongo_1.default.create({
        mongoUrl: DB_URL,
        collectionName: "sessions",
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: false, // false for HTTP on localhost
        sameSite: "lax",
    },
}));
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
app.use("/data/images", express_1.default.static(path_1.default.join(process.cwd(), "src/data/images")));
app.use("/api/auth", auth_router_1.default);
app.use("/api/depart", depart_router_1.default);
app.use("/api/collectingInfo", user_router_1.collectingInfoRouter);
app.use("/api/uploadingEvedince", user_router_1.uploadingEvedinceRouter);
app.use("/api/manual_report", user_router_1.reportManualRouter);
app.use("/api/getReports", user_router_1.getReportsRouter);
app.use("/api/getUsers", user_router_1.getUsersRouter);
app.use("/api/reports", user_router_1.reportsRouter);
app.use("/api/notifications", user_router_1.notificationsRouter);
mongoose_1.default.connect(DB_URL).then(() => {
    console.log("connected to mongoose");
    server.listen(PORT, () => {
        console.log(`Server listening on http://localhost:${PORT}`);
    });
});
//# sourceMappingURL=server.js.map