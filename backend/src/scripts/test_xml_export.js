"use strict";

/**
 * test_xml_export.js
 *
 * Small integration test for the RDF/XML export pipeline.
 * Tests three real records from the live MongoDB database:
 *
 *  1. 2025-0750-AFG — Earthquake, has Lat/Long + Magnitude + nested No field
 *  2. 2026-0153-KEN — Flood, no Lat/Long, no Magnitude, nested No field only
 *  3. A record with Total Deaths = null (verifies missing-value omission)
 *
 * Run from backend/:
 *   node src/scripts/test_xml_export.js
 *
 * Does NOT modify any database records.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const DisasterRecord = require("../models/mongo/DisasterRecord.model");
const {
  extractDisasterCode,
  buildDisasterRdfXml,
  buildBatchRdfXml,
  validateRdfXml,
} = require("../utils/rdfXmlBuilder");

// ─── Inline MongoDB connection (mirrors config/mongodb.js, no side effects) ───

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://sdt_backend:Big_data_backend@cluster0.mrd4mzt.mongodb.net/smart_disaster_db?retryWrites=true&w=majority";

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ─── Individual tests ─────────────────────────────────────────────────────────

async function testRecord(label, disNo, expectations = {}) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`TEST: ${label}`);
  console.log(`DisNo: ${disNo}`);
  console.log("─".repeat(60));

  // Fetch from MongoDB (same query as the controller)
  let doc = await DisasterRecord.findOne({ "DisNo.": disNo }).lean();
  if (!doc) {
    doc = await DisasterRecord.findOne({ DisNo: { "": disNo } }).lean();
  }

  if (!doc) {
    assert("Record found in MongoDB", false, `No document found for ${disNo}`);
    return;
  }
  assert("Record found in MongoDB", true);

  // ID extraction
  const code = extractDisasterCode(doc);
  assert(
    `extractDisasterCode returns "${disNo}"`,
    code === disNo,
    `Got: "${code}"`
  );

  // Build RDF/XML (no Neo4j enrichment in test)
  let xml;
  try {
    xml = buildDisasterRdfXml(doc, null);
    assert("buildDisasterRdfXml succeeds without error", true);
  } catch (err) {
    assert("buildDisasterRdfXml succeeds without error", false, err.message);
    return;
  }

  // Validate
  const result = validateRdfXml(xml);
  assert("XML is well-formed",           result.checks.wellFormedXml);
  assert("Root element is rdf:RDF",      result.checks.hasRdfRoot);
  assert("Has rdf:Description elements", result.checks.hasDescriptions);
  assert("All descriptions have rdf:about", result.checks.allDescriptionsHaveAbout);
  assert(`Triple count > 0`,             result.checks.tripleCount > 0,
    `Got ${result.checks.tripleCount}`);
  assert("overall valid",                result.valid);

  // Subject URI check
  const expectedUri = `http://disaster-digital-twin.local/data/${encodeURIComponent(disNo)}`;
  assert(
    `Subject URI is ${expectedUri}`,
    result.checks.subjectUris.includes(expectedUri),
    `Found: ${result.checks.subjectUris.join(", ")}`
  );

  // Field-specific checks
  if (expectations.hasLatLong) {
    assert("Contains geo:lat",  xml.includes("<geo:lat"));
    assert("Contains geo:long", xml.includes("<geo:long"));
  }
  if (expectations.noLatLong) {
    assert("Does NOT contain geo:lat",  !xml.includes("<geo:lat"));
    assert("Does NOT contain geo:long", !xml.includes("<geo:long"));
  }
  if (expectations.hasMagnitude) {
    assert("Contains ddt:magnitude", xml.includes("<ddt:magnitude"));
  }
  if (expectations.hasInjured) {
    assert("Contains ddt:injured (from nested No field)", xml.includes("<ddt:injured"));
  }
  if (expectations.nullDeaths) {
    // Null numeric fields must be omitted entirely (no empty elements)
    assert(
      "Missing Total Deaths is omitted (no empty ddt:totalDeaths)",
      !xml.includes("<ddt:totalDeaths/>") && !xml.includes("<ddt:totalDeaths></ddt:totalDeaths>")
    );
  }

  console.log(`\n  ℹ Triple count: ${result.checks.tripleCount}`);
  console.log(`  ℹ Subject URIs: ${result.checks.subjectUris.length}`);
  if (result.errors.length > 0) {
    console.log(`  ⚠ Validation errors: ${result.errors.join("; ")}`);
  }

  // Print abbreviated XML (first 30 lines) for review
  const lines = xml.split("\n");
  console.log(`\n  — First 30 lines of generated XML —`);
  lines.slice(0, 30).forEach((l) => console.log(`  ${l}`));
  if (lines.length > 30) console.log(`  ... (${lines.length - 30} more lines)`);
}

async function testBatch() {
  console.log(`\n${"─".repeat(60)}`);
  console.log("TEST: Batch export (3 records, Natural disasters, Asia)");
  console.log("─".repeat(60));

  const docs = await DisasterRecord
    .find({ "Disaster Group": "Natural", "Region": "Asia" })
    .sort({ "Start Year": -1 })
    .limit(3)
    .lean();

  assert(`Fetched ${docs.length} documents`, docs.length > 0);

  let xml;
  try {
    xml = buildBatchRdfXml(docs);
    assert("buildBatchRdfXml succeeds", true);
  } catch (err) {
    assert("buildBatchRdfXml succeeds", false, err.message);
    return;
  }

  const result = validateRdfXml(xml);
  assert("Batch XML is valid", result.valid);
  assert(`Batch has ${docs.length}+ descriptions (events + ref nodes)`,
    result.checks.subjectUris.length >= docs.length);

  console.log(`\n  ℹ Records: ${docs.length}`);
  console.log(`  ℹ Subject URIs in batch: ${result.checks.subjectUris.length}`);
  console.log(`  ℹ Total triples: ${result.checks.tripleCount}`);
}

async function testXmlEscaping() {
  console.log(`\n${"─".repeat(60)}`);
  console.log("TEST: XML escaping (Location field with special characters)");
  console.log("─".repeat(60));

  // Find a record with a complex location string
  const doc = await DisasterRecord
    .findOne({ Location: { $regex: /[,&']/, $options: "i" } })
    .lean();

  if (!doc) {
    console.log("  ⚠ No record with special chars in Location — skipping");
    return;
  }

  const code = extractDisasterCode(doc);
  console.log(`  Using: ${code}, Location: ${String(doc.Location).slice(0, 60)}...`);

  const xml = buildDisasterRdfXml(doc, null);
  const result = validateRdfXml(xml);

  assert("XML with special-char Location is still valid", result.valid);
  assert("No raw & in XML content", !xml.match(/[^;]&(?!amp;|lt;|gt;|quot;|apos;)/));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║          RDF/XML Export — Integration Test Suite         ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  console.log(`\n✅ MongoDB connected: ${mongoose.connection.host}`);
  console.log(`📦 Database: ${mongoose.connection.name}`);

  // Test 1: Afghanistan Earthquake — has Lat/Long, Magnitude, nested No
  await testRecord(
    "Afghanistan Earthquake (Lat/Long + Magnitude + nested No)",
    "2025-0750-AFG",
    { hasLatLong: true, hasMagnitude: true, hasInjured: true }
  );

  // Test 2: Kenya Flood — no Lat/Long, no Magnitude, nested No only
  await testRecord(
    "Kenya Flood (no Lat/Long, no Magnitude, nested No only)",
    "2026-0153-KEN",
    { noLatLong: true, hasInjured: true }
  );

  // Test 3: Find a record with null Total Deaths
  const nullDeathsDoc = await DisasterRecord
    .findOne({ "Total Deaths": null })
    .lean();
  if (nullDeathsDoc) {
    const nullCode = extractDisasterCode(nullDeathsDoc);
    await testRecord(
      `Record with null Total Deaths (${nullCode})`,
      nullCode,
      { nullDeaths: true }
    );
  } else {
    console.log("\n⚠ No record with null Total Deaths found — skipping test 3.");
  }

  // Test 4: Batch export
  await testBatch();

  // Test 5: XML escaping
  await testXmlEscaping();

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log(`RESULTS:  ${passed} passed,  ${failed} failed`);
  console.log("═".repeat(60));

  await mongoose.disconnect();

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("❌ Test runner error:", err.message);
  process.exit(1);
});
