/**
 * Neo4j Structure Inspector
 * Connects and prints all node labels, relationship types, properties, and sample nodes
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const neo4j = require("neo4j-driver");

const URI = process.env.NEO4J_URI;
const USERNAME = process.env.NEO4J_USERNAME;
const PASSWORD = process.env.NEO4J_PASSWORD;

if (!URI || !USERNAME || !PASSWORD) {
  throw new Error(
    "NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD must be set in backend/.env."
  );
}

async function run(driver, query, params = {}) {
  const session = driver.session();
  try {
    const result = await session.run(query, params);
    return result.records;
  } finally {
    await session.close();
  }
}

async function inspect() {
  console.log("\n========================================");
  console.log("  Neo4j Structure Inspector");
  console.log("========================================\n");

  const driver = neo4j.driver(URI, neo4j.auth.basic(USERNAME, PASSWORD));
  await driver.verifyConnectivity();
  console.log(`✅ Connected to Neo4j: ${URI}\n`);

  // ── Node Labels ──────────────────────────────────────────────────────────────
  console.log("📋 NODE LABELS:");
  console.log("─".repeat(40));
  const labelRecords = await run(driver, "CALL db.labels() YIELD label RETURN label ORDER BY label");
  const labels = labelRecords.map((r) => r.get("label"));
  labels.forEach((l) => console.log(`   • ${l}`));

  // ── Relationship Types ───────────────────────────────────────────────────────
  console.log("\n🔗 RELATIONSHIP TYPES:");
  console.log("─".repeat(40));
  const relRecords = await run(driver, "CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType ORDER BY relationshipType");
  const relTypes = relRecords.map((r) => r.get("relationshipType"));
  relTypes.forEach((r) => console.log(`   • ${r}`));

  // ── Property Keys ────────────────────────────────────────────────────────────
  console.log("\n🔑 ALL PROPERTY KEYS:");
  console.log("─".repeat(40));
  const propRecords = await run(driver, "CALL db.propertyKeys() YIELD propertyKey RETURN propertyKey ORDER BY propertyKey");
  propRecords.forEach((r) => console.log(`   • ${r.get("propertyKey")}`));

  // ── Per-Label Details ────────────────────────────────────────────────────────
  for (const label of labels) {
    console.log(`\n${"═".repeat(40)}`);
    console.log(`📦 Label: ${label}`);
    console.log("─".repeat(40));

    // Count
    const countRecs = await run(driver, `MATCH (n:${label}) RETURN count(n) AS cnt`);
    const count = countRecs[0]?.get("cnt").toNumber() ?? 0;
    console.log(`   Count: ${count} nodes`);

    if (count === 0) continue;

    // Sample node properties
    const sampleRecs = await run(driver, `MATCH (n:${label}) RETURN n LIMIT 2`);
    sampleRecs.forEach((r, i) => {
      const node = r.get("n");
      console.log(`\n   Sample Node ${i + 1}:`);
      console.log(`     Labels: ${node.labels.join(", ")}`);
      console.log(`     Properties:`);
      Object.entries(node.properties).forEach(([k, v]) => {
        const val = neo4j.isInt(v) ? v.toNumber() : v;
        console.log(`       ${k}: ${JSON.stringify(val)}`);
      });
    });

    // Outgoing relationships from this label
    const outRels = await run(
      driver,
      `MATCH (n:${label})-[r]->(m) RETURN DISTINCT type(r) AS rel, labels(m) AS targetLabels, count(*) AS cnt LIMIT 20`
    );
    if (outRels.length > 0) {
      console.log(`\n   Outgoing Relationships:`);
      outRels.forEach((r) => {
        const cnt = neo4j.isInt(r.get("cnt")) ? r.get("cnt").toNumber() : r.get("cnt");
        console.log(`     (${label})-[:${r.get("rel")}]->(${r.get("targetLabels").join("|")})  ×${cnt}`);
      });
    }

    // Incoming relationships to this label
    const inRels = await run(
      driver,
      `MATCH (n:${label})<-[r]-(m) RETURN DISTINCT type(r) AS rel, labels(m) AS sourceLabels, count(*) AS cnt LIMIT 20`
    );
    if (inRels.length > 0) {
      console.log(`\n   Incoming Relationships:`);
      inRels.forEach((r) => {
        const cnt = neo4j.isInt(r.get("cnt")) ? r.get("cnt").toNumber() : r.get("cnt");
        console.log(`     (${r.get("sourceLabels").join("|")})-[:${r.get("rel")}]->(${label})  ×${cnt}`);
      });
    }
  }

  // ── Relationship Properties ──────────────────────────────────────────────────
  console.log(`\n${"═".repeat(40)}`);
  console.log("🔗 RELATIONSHIP DETAILS (sample):");
  console.log("─".repeat(40));
  for (const rel of relTypes) {
    const recs = await run(
      driver,
      `MATCH (a)-[r:${rel}]->(b) RETURN labels(a) AS from, labels(b) AS to, keys(r) AS props, r LIMIT 1`
    );
    if (recs.length > 0) {
      const rec = recs[0];
      const props = rec.get("props");
      console.log(
        `   [:${rel}] (${rec.get("from").join("|")})->(${rec.get("to").join("|")})  props: [${props.join(", ") || "none"}]`
      );
    }
  }

  // ── Indexes ──────────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(40)}`);
  console.log("📑 INDEXES:");
  console.log("─".repeat(40));
  const idxRecords = await run(driver, "SHOW INDEXES YIELD name, type, labelsOrTypes, properties");
  idxRecords.forEach((r) => {
    console.log(`   • [${r.get("type")}] ${r.get("labelsOrTypes")} → ${r.get("properties")} (${r.get("name")})`);
  });

  await driver.close();
  console.log("\n✅ Neo4j inspection complete.\n");
}

inspect().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
