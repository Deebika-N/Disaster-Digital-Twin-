const mongoose = require("mongoose");
const logger = require("../utils/logger");

/**
 * Connect to MongoDB using Mongoose
 */
const connectMongoDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
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
    logger.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = { connectMongoDB };

