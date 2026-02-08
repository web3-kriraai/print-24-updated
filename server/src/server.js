import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join, resolve } from "path";
import { existsSync, readFileSync } from "fs";
import authRoutes from "./routes/authRoutes.js";
import apiRoutes from "./routes/index.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import timelineRoutes from "./routes/timeline.js";
import pricingRoutes from "./routes/pricingRoutes.js";
import pricingAdminRoutes from "./routes/admin/pricingAdminRoutes.js";
import userContextRoutes from "./routes/userContextRoutes.js";
import geolocationRoutes from "./routes/geolocation.js";
import currencyRoutes from "./routes/currencyRoutes.js";
import pmsRoutes from "./routes/pmsRoutes.js";
import userPrivilegeRoutes from "./routes/userPrivilegeRoutes.js";
import { authMiddleware } from "./middlewares/authMiddleware.js";

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
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        "http://localhost:5000", "http://localhost:3000", "http://localhost:3001", "http://localhost:5173",
        "http://127.0.0.1:5000", "http://127.0.0.1:3000", "http://127.0.0.1:5173"
      ];
      if (frontendUrl) allowedOrigins.push(frontendUrl);
      if (allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") || origin.includes("ngrok") ||
        origin.includes(".run.app") || origin.includes("prints24")) {
        callback(null, true);
      } else {
        callback(null, true); // For development
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    exposedHeaders: ["Content-Type", "Authorization", "x-rtb-fingerprint-id"],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  }
  next();
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Mount general API routes
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);  // includes order management
app.use("/api", uploadRoutes);
app.use("/api/timeline", timelineRoutes);
app.use("/api/admin", pricingAdminRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/user", userContextRoutes);
app.use("/api/geolocation", geolocationRoutes);
app.use("/api/currency", currencyRoutes);

// PMS Routes (admin only)
app.use("/api/admin/pms", authMiddleware, pmsRoutes);

// User Privilege Routes (authenticated users, non-admin) - NEW
app.use("/api/user", authMiddleware, userPrivilegeRoutes);

app.use((err, req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ---------------------------------------------------------------------------
// SSR CONFIGURATION
// ---------------------------------------------------------------------------

// Verify dist folder exists
const productionClientPath = join(__dirname, "../client-dist"); // Docker: /app/src/../client-dist
const devClientPath = join(__dirname, "../../client/dist"); // Local
const clientDistPath = process.env.NODE_ENV === 'production' && existsSync(productionClientPath)
  ? productionClientPath
  : (existsSync(devClientPath) ? devClientPath : productionClientPath);

const clientDistPathResolved = resolve(clientDistPath);
console.log(`[SSR] Client dist path: ${clientDistPathResolved}`);

// Serve static assets
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath, { index: false }));
  app.use("/assets", express.static(join(clientDistPath, "assets")));
}

// SSR Module Loading
let ssrRender = null;
const ssrPath = join(clientDistPath, "ssr.js");

async function loadSSRModule() {
  if (!existsSync(ssrPath)) {
    console.error(`[SSR] ⚠️ SSR file not found at: ${ssrPath}`);
    return false;
  }
  try {
    console.error("[SSR] Loading SSR module...");
    const ssrUrl = pathToFileURL(ssrPath).href;
    const m = await import(ssrUrl);
    ssrRender = m.render || m.default?.render || (typeof m.default === 'function' ? m.default : null);
    if (ssrRender) {
      console.error("[SSR] ✅ SSR module loaded successfully");
      return true;
    }
    console.error("[SSR] ⚠️ Render function not found in SSR module");
    return false;
  } catch (err) {
    console.error(`[SSR] ❌ Failed to load SSR module: ${err.message}`);
    return false;
  }
}

// SSR Handler
app.use(async (req, res, next) => {
  // Skip API, static, etc.
  if (req.path.startsWith("/api") || req.path.startsWith("/uploads") ||
    req.path.startsWith("/assets") || /\.(js|css|png|jpg|jpeg|gif|svg|ico|json)$/i.test(req.path)) {
    return next();
  }

  if (req.method !== "GET") return next();

  // If SSR is not ready/loaded, fallback to standard SPA serving
  if (!ssrRender) {
    const templatePath = join(clientDistPath, "index.html");
    if (existsSync(templatePath)) {
      return res.sendFile(templatePath);
    }
    return next();
  }

  try {
    const templatePath = join(clientDistPath, "index.html");
    if (!existsSync(templatePath)) return next();

    let template = readFileSync(templatePath, "utf-8");

    // Cleanup vite scripts
    template = template.replace(/<link[^>]*rel\s*=\s*["']modulepreload["'][^>]*>/gi, '');
    template = template.replace(/<script[^>]*src\s*=\s*["']\/assets\/[^"']*\.js["'][^>]*>[\s\S]*?<\/script>/gi, '');

    if (!template.includes('src="/client.js"') && !template.includes("src='/client.js'")) {
      template = template.replace('</body>', '<script type="module" src="/client.js"></script></body>');
    }

    let appHtml = "";
    if (ssrRender) {
      try {
        appHtml = ssrRender(req.url) || "";
        // Clean up React Router resource hints
        appHtml = appHtml.replace(/<link[^>]*rel\s*=\s*["']preload["'][^>]*>/gi, '');
      } catch (e) {
        console.error(`[SSR] Render error: ${e.message}`);
        // Fallback to client-side rendering
        return res.sendFile(templatePath);
      }
    } else {
      // Should be handled by top check, but safe fallback
      return res.sendFile(templatePath);
    }

    // Inject HTML
    let html = template;
    if (template.includes('<!--app-html-->')) {
      html = template.replace('<!--app-html-->', appHtml);
    } else if (template.includes('<div id="root">')) {
      html = template.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${appHtml}</div>`);
    } else {
      html = template.replace('</body>', `${appHtml}</body>`);
    }

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    console.error("[SSR] Handler error:", err);
    // Final fallback
    const templatePath = join(clientDistPath, "index.html");
    if (existsSync(templatePath)) res.sendFile(templatePath);
    else next();
  }
});

// DB + SERVER
if (!process.env.MONGO_URI_PRICING) {
  // Try MONGO_TEST_URI fallback if available, mostly for dev compatibility
  if (process.env.MONGO_TEST_URI) {
    process.env.MONGO_URI_PRICING = process.env.MONGO_TEST_URI;
  } else {
    console.error("❌ ERROR: MONGO_URI_PRICING environment variable is not set!");
    process.exit(1);
  }
}

async function startServer() {
  await loadSSRModule();

  try {
    await mongoose.connect(process.env.MONGO_URI_PRICING, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });
    console.log("✅ MongoDB connected successfully");

    // Payment init
    try {
      const { paymentRouter } = await import('./services/payment/index.js');
      await paymentRouter.loadProviders();
      console.log("💳 Payment initialized");
    } catch (e) { }

    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📦 SSR Enabled - Access: http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}

startServer();
