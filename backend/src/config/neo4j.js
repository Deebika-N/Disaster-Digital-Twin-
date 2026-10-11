const neo4j = require("neo4j-driver");
const logger = require("../utils/logger");

let driver = null;

/**
 * Connect to Neo4j Aura database
 */
const connectNeo4j = async () => {
  try {
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 10000,
        logging: {
          level: "warn",
          logger: (level, message) => logger.warn(`Neo4j [${level}]: ${message}`),
        },
      }
    );

    // Verify connectivity
    await driver.verifyConnectivity();
    logger.info("✅ Neo4j Connected successfully");
    logger.info(`🔗 Neo4j URI: ${process.env.NEO4J_URI}`);

    return driver;
  } catch (error) {
    logger.error("❌ Neo4j Connection Failed:", error.message);
    process.exit(1);
  }
};

/**
 * Get the Neo4j driver instance
 */
const getDriver = () => {
  if (!driver) {
    throw new Error("Neo4j driver not initialized. Call connectNeo4j() first.");
  }
  return driver;
};

/**
 * Get a new Neo4j session.
 * Neo4j Aura does not expose a named database — session must be opened
 * without specifying a database name (uses the Aura default).
 */
const getSession = () => {
  return getDriver().session();
};

/**
 * Run a Cypher query with automatic session management
 * @param {string} query - Cypher query string
 * @param {object} params - Query parameters
 * @param {string} mode - 'READ' or 'WRITE'
 */
const runQuery = async (query, params = {}, mode = "WRITE") => {
  const session = getSession();
  try {
    const result = await session.run(query, params);
    return result;
  } catch (error) {
    logger.error("Neo4j Query Error:", error.message);
    throw error;
  } finally {
    await session.close();
  }
};

/**
 * Close the Neo4j driver (for graceful shutdown)
 */
const closeNeo4j = async () => {
  if (driver) {
    await driver.close();
    driver = null;
    logger.info("Neo4j driver closed.");
  }
};

module.exports = { connectNeo4j, getDriver, getSession, runQuery, closeNeo4j };

