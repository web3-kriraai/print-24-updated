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
import geolocationRoutes from "./routes/geolocation.js";
import currencyRoutes from "./routes/currencyRoutes.js";

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
      "Authorization",
      "x-rtb-fingerprint-id"
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

// Mount general API routes (includes order management at /api/admin/orders/*)
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);  // This includes order management routes
app.use("/api", uploadRoutes);
app.use("/api/timeline", timelineRoutes);

// Mount pricing admin routes (at /api/admin/pricing, /api/admin/modifiers, etc)
// Note: This must come AFTER apiRoutes so order management routes are matched first
app.use("/api/admin", pricingAdminRoutes);

app.use("/api/pricing", pricingRoutes);
app.use("/api/user", userContextRoutes);  // User context API
app.use("/api/geolocation", geolocationRoutes);  // Geolocation API
app.use("/api/currency", currencyRoutes);  // Currency conversion API

// Serve static files from client dist (for production)
// Try production path first (Docker), then fall back to local dev path
const productionClientPath = join(__dirname, "../client-dist");
const devClientPath = join(__dirname, "../../client/dist");
const clientDistPath = existsSync(productionClientPath) ? productionClientPath : devClientPath;

if (existsSync(clientDistPath)) {
  console.log(`📦 Serving static files from: ${clientDistPath}`);
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
} else {
  console.log("⚠️  No client build found. API-only mode.");
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
if (!process.env.MONGO_URI_PRICING) {
  console.error("❌ ERROR: MONGO_URI_PRICING environment variable is not set!");
  console.error("Please check your .env file and ensure MONGO_URI_PRICING is configured.");
  process.exit(1);
}

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI_PRICING, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority'
  })
  .then(async () => {
    console.log("✅ MongoDB connected successfully");

    // Initialize Payment Gateway Orchestration System
    try {
      const { paymentRouter } = await import('./services/payment/index.js');
      await paymentRouter.loadProviders();
      console.log("💳 Payment Gateway Orchestration initialized");

      // Start reconciliation service (optional - controlled by env)
      const reconciliationService = (await import('./services/reconciliation.service.js')).default;
      reconciliationService.schedule();
    } catch (paymentError) {
      console.warn("⚠️ Payment system initialization warning:", paymentError.message);
      console.warn("   Payment features may be limited until configuration is complete.");
    }

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
