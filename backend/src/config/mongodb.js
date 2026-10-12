const dns = require("node:dns");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

const redactMongoCredentials = (message) =>
  String(message).replace(
    /(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi,
    "$1[REDACTED]@"
  );

const getMongoUri = () => {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error(
      "MONGODB_URI is missing. Set it in backend/.env before starting the server."
    );
  }

  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error(
      "MONGODB_URI is malformed. It must start with mongodb:// or mongodb+srv://."
    );
  }

  if (/<[^>]+>/.test(uri)) {
    throw new Error(
      "MONGODB_URI still contains placeholder values. Replace them with the Atlas connection details."
    );
  }

  return uri;
};

const configureMongoDns = () => {
  const configuredServers = process.env.MONGODB_DNS_SERVERS?.trim();

  if (!configuredServers) {
    return;
  }

  const servers = configuredServers
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (servers.length === 0) {
    throw new Error(
      "MONGODB_DNS_SERVERS is configured but contains no valid servers."
    );
  }

  dns.setServers(servers);
  logger.info(`MongoDB DNS servers configured: ${servers.length}`);
};

/**
 * Connect to MongoDB using Mongoose
 */
const connectMongoDB = async () => {
  try {
    configureMongoDns();

    const conn = await mongoose.connect(getMongoUri(), {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📦 Database: ${conn.connection.name}`);

    // MongoDB connection event listeners
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected.");
    });
  } catch (error) {
    logger.error(
      `❌ MongoDB Connection Failed [${error.name || "Error"}]: ${redactMongoCredentials(
        error.message
      )}`
    );
    process.exit(1);
  }
};

module.exports = { connectMongoDB };
