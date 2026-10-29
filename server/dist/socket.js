"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocketIO = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const initSocketIO = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: [
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://127.0.0.1:5175",
            ],
            credentials: true,
        },
    });
    io.on("connection", (socket) => {
        // Citizen user room join
        socket.on("join_user", (userId) => {
            if (userId) {
                const roomName = `user:${userId}`;
                socket.join(roomName);
            }
        });
        // Department authority room join
        socket.on("join_department", (deptId) => {
            if (deptId) {
                const roomName = `department:${deptId}`;
                socket.join(roomName);
            }
        });
        // Category room join
        socket.on("join_category", (category) => {
            if (category) {
                const roomName = `category:${category}`;
                socket.join(roomName);
            }
        });
    });
    return io;
};
exports.initSocketIO = initSocketIO;
const getIO = () => {
    return io;
};
exports.getIO = getIO;
//# sourceMappingURL=socket.js.map