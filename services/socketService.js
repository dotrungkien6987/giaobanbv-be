const { Server } = require("socket.io");
const User = require("../models/User");
const { authenticateAccessToken } = require("../helpers/accessTokenAuth");
const {
  shouldDisableLegacyRealtime,
} = require("../modules/workmanagement/helpers/legacyCutover");

// Import shared CORS origin resolver
const { getAllowedOrigins } = require("../config/corsConfig");

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
    this.isDisabled = false;
  }

  /**
   * Initialize Socket.IO with HTTP server
   * @param {http.Server} httpServer
   */
  init(httpServer) {
    if (shouldDisableLegacyRealtime()) {
      this.isDisabled = true;
      this.io = null;
      this.onlineUsers.clear();
      console.log(
        "[SocketService] ⏭️ Legacy realtime disabled by cutover flag",
      );
      return;
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: getAllowedOrigins(),
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

        const authContext = await authenticateAccessToken(token);
        const user = await User.findById(authContext.userId);

        if (!user) {
          return next(new Error("User not found"));
        }

        // Attach user to socket
        socket.userId = user._id.toString();
        socket.user = user;
        socket.authJti = authContext.jti || null;
        socket.data.authJti = authContext.jti || null;
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
          `[Socket] User disconnected: ${userId} (socket: ${socket.id})`,
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
    if (this.isDisabled || !this.io) {
      return false;
    }

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
    if (this.isDisabled || !this.io) {
      return;
    }

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
    if (this.isDisabled || !this.io) {
      return;
    }

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

  async disconnectByAuthJti(jti) {
    if (this.isDisabled || !this.io || !jti) {
      return 0;
    }

    const sockets = await this.io.fetchSockets();
    let disconnectedCount = 0;

    sockets.forEach((socket) => {
      if ((socket.data?.authJti || socket.authJti) !== jti) {
        return;
      }

      disconnectedCount += 1;
      socket.disconnect(true);
    });

    return disconnectedCount;
  }
}

// Singleton export
module.exports = new SocketService();
