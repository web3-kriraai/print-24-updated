import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import authRoutes from "./routes/authRoutes.js";
import apiRoutes from "./routes/index.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import timelineRoutes from "./routes/timeline.js";
import pricingRoutes from "./routes/pricingRoutes.js";
import pricingAdminRoutes from "./routes/admin/pricingAdminRoutes.js";
import userContextRoutes from "./routes/userContextRoutes.js";

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

// CORS Configuration
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
        "http://127.0.0.1:5173"
      ];

      // Add FRONTEND_URL from .env if it exists
      if (frontendUrl) {
        allowedOrigins.push(frontendUrl);
      }

      // Allow if origin is in the list or if it's a localhost/127.0.0.1 origin
      if (allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")) {
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

app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/api", uploadRoutes);
app.use("/api/timeline", timelineRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/admin", pricingAdminRoutes);
app.use("/api/user", userContextRoutes);  // NEW: User context API

// Serve static files from client dist (for production)
const clientDistPath = join(__dirname, "../../client/dist");
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  
  // For SPA routing - serve index.html for all non-API routes
  // Use middleware approach for Express 5 compatibility
  app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith("/api")) {
      return next();
    }
    // Skip static file requests
    if (req.method !== "GET" || /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json)$/i.test(req.path)) {
      return next();
    }
    // Serve index.html for SPA routes
    res.sendFile(join(clientDistPath, "index.html"));
  });
}

// Error handler
app.use((err, req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// DB + SERVER
if (!process.env.MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI environment variable is not set!");
  console.error("Please check your .env file and ensure MONGO_URI is configured.");
  process.exit(1);
}

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority'
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`========================================`);
      console.log(`🚀 Backend Server running on port ${port}`);
      console.log(`📦 Access: http://localhost:${port}`);
      console.log(`========================================`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
