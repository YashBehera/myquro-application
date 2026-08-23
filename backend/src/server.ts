import "dotenv/config";
import { app } from "./app.js";
import { Server as SocketServer } from "socket.io";
import { initializeSocket } from "./lib/socket.js";

const PORT = Number(process.env.PORT) || 4000;

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});

// Initialize WebSocket server (works on Render and other platforms)
const io = new SocketServer(server, {
  cors: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

initializeSocket(io);

app.set("trust proxy", true);

// Export for Vercel
export default app;
