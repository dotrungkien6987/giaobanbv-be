const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Import shared CORS whitelist
const { whitelist } = require("../config/corsConfig");

/**
 * SocketService - Singleton quản lý Socket.IO connections
 *
 * Features:
 * - JWT authentication middleware
 * - Track online users (userId -> socketId)
 * - Emit to specific user(s)
 * - Check user online status
 */
class SocketService {
  constructor() {
    this.io = null;
    this.onlineUsers = new Map(); // userId -> Set<socketId> (support multiple connections per user)
  }

  /**
   * Initialize Socket.IO with HTTP server
   * @param {http.Server} httpServer
   */
  init(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGINS
          ? process.env.CORS_ORIGINS.split(",")
          : whitelist, // ✅ Sử dụng whitelist từ app.js
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        // Verify JWT - sử dụng JWT_SECRET_KEY như trong project
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET_KEY || process.env.JWT_SECRET
        );
        const user = await User.findById(decoded._id);

        if (!user) {
          return next(new Error("User not found"));
        }

        // Attach user to socket
        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        console.error("[SocketService] Auth error:", error.message);
        next(new Error("Invalid token"));
      }
    });

    // Connection handler
    this.io.on("connection", (socket) => {
      const userId = socket.userId;
      console.log(`[Socket] User connected: ${userId} (socket: ${socket.id})`);

      // Track online user - support multiple connections (multiple tabs/browsers)
      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId).add(socket.id);

      // Join user-specific room for easier targeting
      socket.join(`user:${userId}`);

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(
          `[Socket] User disconnected: ${userId} (socket: ${socket.id})`
        );
        const userSockets = this.onlineUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          // Remove user from map if no more connections
          if (userSockets.size === 0) {
            this.onlineUsers.delete(userId);
          }
        }
      });

      // Handle notification events from client (for real-time sync across tabs)
      socket.on("notification:read", async (data) => {
        // Broadcast to other tabs of same user
        socket.to(`user:${userId}`).emit("notification:read", data);
      });

      socket.on("notification:read-all", async () => {
        // Broadcast to other tabs of same user
        socket.to(`user:${userId}`).emit("notification:read-all");
      });
    });

    console.log("[SocketService] ✅ Initialized");
  }

  /**
   * Emit event to specific user (all their connections/tabs/browsers)
   * @param {string} userId
   * @param {string} event
   * @param {any} data
   * @returns {boolean} - true if user is online
   */
  emitToUser(userId, event, data) {
    const userIdStr = userId.toString();
    // Use room to emit to ALL connections of this user
    // (each socket joins room `user:${userId}` on connect)
    this.io.to(`user:${userIdStr}`).emit(event, data);
    return this.onlineUsers.has(userIdStr);
  }

  /**
   * Emit event to multiple users
   * @param {string[]} userIds
   * @param {string} event
   * @param {any} data
   */
  emitToUsers(userIds, event, data) {
    userIds.forEach((userId) => {
      this.emitToUser(userId, event, data);
    });
  }

  /**
   * Emit event to all connected users
   * @param {string} event
   * @param {any} data
   */
  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Check if user is online
   * @param {string} userId
   * @returns {boolean}
   */
  isUserOnline(userId) {
    return this.onlineUsers.has(userId.toString());
  }

  /**
   * Get all online user IDs
   * @returns {string[]}
   */
  getOnlineUsers() {
    return Array.from(this.onlineUsers.keys());
  }

  /**
   * Get Socket.IO instance
   * @returns {Server}
   */
  getIO() {
    return this.io;
  }
}

// Singleton export
module.exports = new SocketService();
