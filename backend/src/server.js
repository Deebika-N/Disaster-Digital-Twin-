require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");

const { connectMongoDB } = require("./config/mongodb");
const { connectNeo4j, closeNeo4j } = require("./config/neo4j");
const logger       = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");
const notFound     = require("./middleware/notFound");

// Route imports
const disasterRoutes  = require("./routes/disaster.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const graphRoutes     = require("./routes/graph.routes");
const xmlRoutes       = require("./routes/xml.routes");

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin:       process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials:  true,
    methods:      ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs:       parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:            parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// ─── Body parsing & logging ───────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined", { stream: { write: (m) => logger.info(m.trim()) } }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success:     true,
    message:     "Disaster Digital Twin API is running",
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV,
    databases: {
      mongodb: "smart_disaster_db / disasters_normalized (13,259 records)",
      neo4j:   "DisasterRecord · Country · DisasterType · Year",
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
// Base: /api/v1
app.use("/api/v1/disasters",  disasterRoutes);   // MongoDB — disasters_normalized
app.use("/api/v1/analytics",  analyticsRoutes);  // MongoDB aggregations + Neo4j
app.use("/api/v1/graph",      graphRoutes);      // Neo4j graph queries
app.use("/api/v1/xml",        xmlRoutes);        // RDF/XML export — read-only

// ─── 404 / Error handling ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectMongoDB();
    await connectNeo4j();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
      logger.info(`📡 Health: http://localhost:${PORT}/health`);
      logger.info(`📦 Endpoints:`);
      logger.info(`   GET  /api/v1/disasters          — list/filter EM-DAT records`);
      logger.info(`   GET  /api/v1/disasters/stats     — aggregated statistics`);
      logger.info(`   GET  /api/v1/disasters/map       — map-ready lat/lng data`);
      logger.info(`   GET  /api/v1/analytics/dashboard — KPI dashboard`);
      logger.info(`   GET  /api/v1/analytics/heatmap   — choropleth data`);
      logger.info(`   GET  /api/v1/graph/overview       — Neo4j graph summary`);
      logger.info(`   GET  /api/v1/graph/country/:iso   — country graph node`);
      logger.info(`   GET  /api/v1/xml/disaster/:disNo  — single record as RDF/XML`);
      logger.info(`   GET  /api/v1/xml/export           — batch RDF/XML export`);
      logger.info(`   GET  /api/v1/xml/validate/:disNo  — XML validation report`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        await closeNeo4j();
        logger.info("Server closed.");
        process.exit(0);
      });
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));

    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled rejection:", reason);
      server.close(() => process.exit(1));
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();

module.exports = app;
