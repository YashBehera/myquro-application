#!/usr/bin/env node

// Quick test to verify WebSocket server starts
import "dotenv/config";
import { app } from "./dist/app.js";
import { Server as SocketServer } from "socket.io";
import { initializeSocket } from "./dist/lib/socket.js";

const PORT = process.env.PORT || 4000;

console.log("🧪 Testing WebSocket server startup...");

try {
  const server = app.listen(PORT, () => {
    console.log(`✅ Server started on port ${PORT}`);
  });

  const io = new SocketServer(server, {
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  initializeSocket(io);
  console.log("✅ WebSocket server initialized");

  // Test health endpoint
  setTimeout(async () => {
    try {
      const response = await fetch(`http://localhost:${PORT}/health`);
      const data = await response.json();
      console.log("✅ Health check passed:", data);

      if (data.websocket === 'enabled') {
        console.log("✅ WebSocket is enabled in production!");
      }

      server.close(() => {
        console.log("✅ Test completed successfully");
        process.exit(0);
      });
    } catch (error) {
      console.error("❌ Health check failed:", error);
      process.exit(1);
    }
  }, 1000);

} catch (error) {
  console.error("❌ WebSocket server test failed:", error);
  process.exit(1);
}