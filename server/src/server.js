import express from "express";
import http from "http";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { initializeSocket } from "./designer/config/socket.js";
import authRoutes from "./routes/authRoutes.js";
import apiRoutes from "./routes/index.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import timelineRoutes from "./routes/timeline.js";
import aboutRoutes from "./routes/aboutRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from server folder (one level up from src)
dotenv.config({ path: join(__dirname, "../.env") });

const app = express();

// Trust proxy for reverse proxy setups
app.set("trust proxy", true);

// CORS - Configure allowed origins
const frontendUrl = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.replace(/\/$/, '')
  : null;

// CORS Configuration - Must be before all routes
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
      if (!origin) {
        return callback(null, true);
      }

      // List of allowed origins
      const allowedOrigins = [
        "http://localhost:5000",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://prints24.in",
        "https://www.prints24.in"
      ];

      // Add FRONTEND_URL from .env if it exists
      if (frontendUrl) {
        allowedOrigins.push(frontendUrl);
      }

      // Allow if origin is in the list or if it's a localhost/127.0.0.1 origin or ngrok
      if (allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.includes("ngrok-free.dev") ||
        origin.includes("ngrok.io") ||
        origin.includes(".run.app") ||
        origin.includes("prints24")) {
        callback(null, true);
      } else {
        // For development, allow all origins
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With"
    ],
    exposedHeaders: [
      "Content-Type",
      "Authorization"
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// Increase body parser limit to handle large base64 image data (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API ROUTES
app.use("/api", (req, res, next) => {
  console.log(`[API] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Health check endpoint (for Docker and Cloud Run)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/api", uploadRoutes);
app.use("/api/timeline", timelineRoutes);
app.use("/api/about", aboutRoutes);

// Error handler to ensure CORS headers are set even on errors
app.use((err, req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Serve uploads folder
const uploadsPath = join(__dirname, "../uploads");

if (existsSync(uploadsPath)) {
  app.use("/uploads", express.static(uploadsPath));
  console.log(`[Server] ✅ Serving uploads from: ${uploadsPath}`);
} else {
  // Create uploads directory if it doesn't exist
  const fs = await import('fs');
  if (!fs.existsSync(uploadsPath)) {
    try {
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log(`[Server] Created uploads directory at: ${uploadsPath}`);
    } catch (err) {
      console.error(`[Server] ❌ Failed to create uploads directory: ${err.message}`);
    }
  }
  app.use("/uploads", express.static(uploadsPath));
  console.log(`[Server] ✅ Serving uploads from: ${uploadsPath}`);
}

// For local development with client dist
const clientDistPath = process.env.NODE_ENV === 'production'
  ? join(__dirname, "../client/dist")
  : join(__dirname, "../../client/dist");

if (existsSync(clientDistPath)) {
  // Serve static files from dist folder
  app.use(express.static(clientDistPath, {
    index: false,
    dotfiles: 'ignore',
  }));
  console.log(`[Server] ✅ Serving static files from: ${clientDistPath}`);

  // SPA Fallback for local dev
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    if (req.method !== "GET") {
      return next();
    }
    const indexPath = join(clientDistPath, "index.html");
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
} else {
  console.log(`[Server] ℹ️ Running in API-only mode (no client dist)`);
}

// 404 handler for API routes
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// DB + SERVER
if (!process.env.MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI environment variable is not set!");
  console.error("Please check your .env file and ensure MONGO_URI is configured.");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority'
  })
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    const port = process.env.PORT || 5000;

    // Create HTTP server for Socket.io compatibility
    const server = http.createServer(app);
    initializeSocket(server);

    // Import workers (they auto-start via setInterval)
    await import("./designer/workers/queue.worker.js");
    await import("./designer/workers/timer.worker.js");

    server.listen(port, () => {
      console.log(`========================================`);
      console.log(`🚀 Backend Server running on port ${port}`);
      console.log(`🔌 Socket.io initialized`);
      console.log(`📦 API Mode - Access: http://localhost:${port}/api`);
      console.log(`========================================`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:");
    console.error("==========================================");

    if (err.message.includes("authentication failed") || err.message.includes("bad auth")) {
      console.error("🔐 Authentication Error:");
      console.error("   - Check your MongoDB username and password");
    } else if (err.message.includes("IP") || err.message.includes("whitelist")) {
      console.error("🌐 IP Whitelist Error:");
      console.error("   - Your IP address is not whitelisted in MongoDB Atlas");
    } else if (err.message.includes("ECONNREFUSED") || err.message.includes("connection")) {
      console.error("🔌 Connection Error:");
      console.error("   - Check your internet connection");
    }

    console.error("\nFull error details:", err.message);
    process.exit(1);
  });
