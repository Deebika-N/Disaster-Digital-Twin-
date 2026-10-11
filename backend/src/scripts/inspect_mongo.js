/**
 * MongoDB Structure Inspector
 * Connects to the DB and prints all collections + sample docs + field analysis
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://sdt_backend:Big_data_backend@cluster0.mrd4mzt.mongodb.net/smart_disaster_db?retryWrites=true&w=majority";

async function inspect() {
  console.log("\n========================================");
  console.log("  MongoDB Structure Inspector");
  console.log("========================================\n");

  await mongoose.connect(MONGODB_URI);
  console.log(`✅ Connected to MongoDB: ${mongoose.connection.host}`);
  console.log(`📦 Database: ${mongoose.connection.name}\n`);

  const db = mongoose.connection.db;

  // List all collections
  const collections = await db.listCollections().toArray();
  console.log(`📋 Collections found: ${collections.length}`);
  console.log("─".repeat(40));

  for (const col of collections) {
    const colName = col.name;
    const collection = db.collection(colName);

    const count = await collection.countDocuments();
    console.log(`\n📁 Collection: "${colName}" (${count} documents)`);
    console.log("─".repeat(40));

    if (count === 0) {
      console.log("   (empty collection)");
      continue;
    }

    // Get 2 sample docs
    const samples = await collection.find({}).limit(2).toArray();

    // Collect all unique keys across samples + deeper analysis
    const allKeys = new Set();
    const keyTypes = {};

    samples.forEach((doc) => {
      analyzeKeys(doc, "", allKeys, keyTypes);
    });

    console.log(`   Fields (${allKeys.size} unique top-level paths):`);
    for (const key of [...allKeys].sort()) {
      console.log(`     • ${key}: ${keyTypes[key] || "unknown"}`);
    }

    console.log(`\n   Sample Document 1:`);
    console.log(JSON.stringify(samples[0], null, 4));

    if (samples[1]) {
      console.log(`\n   Sample Document 2:`);
      console.log(JSON.stringify(samples[1], null, 4));
    }

    console.log("\n" + "═".repeat(40));
  }

  await mongoose.disconnect();
  console.log("\n✅ MongoDB inspection complete.\n");
}

function analyzeKeys(obj, prefix, allKeys, keyTypes, depth = 0) {
  if (depth > 3) return;
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    allKeys.add(fullKey);
    const type = Array.isArray(v) ? `Array[${typeof v[0]}]` : typeof v;
    keyTypes[fullKey] = type;
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      analyzeKeys(v, fullKey, allKeys, keyTypes, depth + 1);
    }
  }
}

inspect().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});

