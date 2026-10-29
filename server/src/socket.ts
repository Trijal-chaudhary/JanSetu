import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";

let io: SocketIOServer | null = null;

export const initSocketIO = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
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
    socket.on("join_user", (userId: string) => {
      if (userId) {
        const roomName = `user:${userId}`;
        socket.join(roomName);
      }
    });

    // Department authority room join
    socket.on("join_department", (deptId: string) => {
      if (deptId) {
        const roomName = `department:${deptId}`;
        socket.join(roomName);
      }
    });

    // Category room join
    socket.on("join_category", (category: string) => {
      if (category) {
        const roomName = `category:${category}`;
        socket.join(roomName);
      }
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};
