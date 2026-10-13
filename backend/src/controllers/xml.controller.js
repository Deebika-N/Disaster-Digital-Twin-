"use strict";

/**
 * xml.controller.js
 *
 * Three read-only RDF/XML endpoints:
 *
 *   exportSingleXml  GET /api/v1/xml/disaster/:disNo
 *     - Fetches one MongoDB disaster record by DisNo code
 *     - Enriches with Neo4j graph data (Country, Type, Year nodes)
 *     - Returns complete RDF/XML with subject-predicate-object triples
 *     - Content-Type: application/rdf+xml
 *
 *   exportBatchXml   GET /api/v1/xml/export
 *     - Accepts same filter params as /api/v1/disasters
 *     - MongoDB only (no per-record Neo4j calls — performance)
 *     - Up to 50 records per request
 *     - Content-Type: application/rdf+xml
 *
 *   validateXml      GET /api/v1/xml/validate/:disNo
 *     - Fetches one record from MongoDB
 *     - Builds RDF/XML internally, then validates it
 *     - Returns JSON validation report
 *     - Does NOT stream XML to the client — only the validation result
 *
 * Safety guarantee: NO CREATE / UPDATE / DELETE operations on either database.
 */

const DisasterRecord = require("../models/mongo/DisasterRecord.model");
const DisasterGraph  = require("../models/neo4j/DisasterGraph.model");
const AppError       = require("../utils/AppError");
const logger         = require("../utils/logger");
const {
  buildDisasterRdfXml,
  buildBatchRdfXml,
  validateRdfXml,
  extractDisasterCode,
} = require("../utils/rdfXmlBuilder");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find a MongoDB document by its DisNo code.
 * Searches both DisNo[""] (live format) and "DisNo." (schema fallback).
 *
 * @param {string} disNo - e.g. "2025-0750-AFG"
 * @returns {object|null} Lean MongoDB document, or null
 */
async function findByDisNo(disNo) {
  // Primary: nested object format { "": "2025-0750-AFG" }
  let doc = await DisasterRecord.findOne({ "DisNo.": disNo }).lean();
  if (!doc) {
    doc = await DisasterRecord.findOne({ DisNo: { "": disNo } }).lean();
  }
  return doc;
}

/**
 * Build a Mongoose filter from XML export query params.
 * Accepts a safe subset of the full disaster filter params.
 *
 * @param {object} query - req.query
 * @returns {object} Mongoose filter
 */
function buildXmlFilter(query) {
  const { type, region, iso, subregion, startYear, endYear, group } = query;
  const filter = {};

  if (type)      filter["Disaster Type"]  = new RegExp(`^${type}$`, "i");
  if (group)     filter["Disaster Group"] = new RegExp(`^${group}$`, "i");
  if (region)    filter["Region"]         = new RegExp(`^${region}$`, "i");
  if (subregion) filter["Subregion"]      = new RegExp(subregion, "i");
  if (iso)       filter["ISO"]            = iso.toUpperCase();

  if (startYear || endYear) {
    filter["Start Year"] = {};
    if (startYear) filter["Start Year"].$gte = parseInt(startYear, 10);
    if (endYear)   filter["Start Year"].$lte = parseInt(endYear, 10);
  }

  return filter;
}

// ─── Controller 1: Single Record Export ───────────────────────────────────────

/**
 * GET /api/v1/xml/disaster/:disNo
 *
 * Exports a single disaster record as RDF/XML.
 * Enriches with Neo4j Country/Type/Year nodes when available.
 *
 * Path param:
 *   :disNo  — Disaster code, e.g. "2025-0750-AFG"
 *
 * Response:
 *   Content-Type: application/rdf+xml
 *   Body: RDF/XML document
 */
const exportSingleXml = async (req, res, next) => {
  try {
    const { disNo } = req.params;

    // ── 1. Fetch MongoDB document ────────────────────────────────────────────
    const doc = await findByDisNo(disNo);
    if (!doc) {
      return next(new AppError(`Disaster record not found: ${disNo}`, 404));
    }

    // ── 2. Attempt Neo4j enrichment (non-fatal if unavailable) ───────────────
    let graphData = null;
    try {
      // The existing eventKey format used in Neo4j: {'': '2025-0750-AFG'}
      const eventKey = `{'': '${disNo}'}`;
      graphData = await DisasterGraph.getRecordWithRelations(eventKey);
    } catch (graphErr) {
      logger.warn(`XML export: Neo4j enrichment skipped for ${disNo}: ${graphErr.message}`);
    }

    // ── 3. Build RDF/XML ─────────────────────────────────────────────────────
    const xml = buildDisasterRdfXml(doc, graphData);

    // ── 4. Respond ───────────────────────────────────────────────────────────
    res.setHeader("Content-Type", "application/rdf+xml; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${disNo}.rdf"`);
    res.status(200).send(xml);

  } catch (err) {
    next(err);
  }
};

// ─── Controller 2: Batch Export ───────────────────────────────────────────────

/**
 * GET /api/v1/xml/export
 *
 * Exports multiple disaster records as a single RDF/XML document.
 * MongoDB only — no Neo4j enrichment (performance: up to 50 records).
 * Relationships are derived from MongoDB fields (ISO, Disaster Type, Start Year).
 *
 * Query params:
 *   type        Disaster type (e.g. "Earthquake")
 *   group       Disaster group (e.g. "Natural")
 *   region      Region (e.g. "Asia")
 *   subregion   Subregion (e.g. "Southern Asia")
 *   iso         3-letter ISO country code (e.g. "AFG")
 *   startYear   Filter from year (inclusive)
 *   endYear     Filter to year (inclusive)
 *   limit       Max records to return (default: 20, max: 50)
 *
 * Response:
 *   Content-Type: application/rdf+xml
 */
const exportBatchXml = async (req, res, next) => {
  try {
    const rawLimit = parseInt(req.query.limit, 10) || 20;
    const limit    = Math.min(Math.max(rawLimit, 1), 50);  // clamp 1–50

    const filter = buildXmlFilter(req.query);

    // ── Fetch records (MongoDB, read-only) ───────────────────────────────────
    const docs = await DisasterRecord
      .find(filter)
      .sort({ "Start Year": -1 })
      .limit(limit)
      .lean();

    if (docs.length === 0) {
      return next(new AppError("No disaster records matched the given filters.", 404));
    }

    // ── Build batch RDF/XML ──────────────────────────────────────────────────
    const xml = buildBatchRdfXml(docs);

    // ── Respond ──────────────────────────────────────────────────────────────
    const filename = `disasters-export-${Date.now()}.rdf`;
    res.setHeader("Content-Type", "application/rdf+xml; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("X-Record-Count", String(docs.length));
    res.status(200).send(xml);

  } catch (err) {
    next(err);
  }
};

// ─── Controller 3: Validate ───────────────────────────────────────────────────

/**
 * GET /api/v1/xml/validate/:disNo
 *
 * Fetches a disaster record from MongoDB, builds its RDF/XML,
 * then validates the XML and returns a JSON validation report.
 * Does NOT stream XML — validation result only.
 *
 * Path param:
 *   :disNo — Disaster code, e.g. "2025-0750-AFG"
 *
 * Response JSON:
 * {
 *   "success": true,
 *   "disNo": "2025-0750-AFG",
 *   "valid": true,
 *   "checks": {
 *     "wellFormedXml": true,
 *     "hasRdfRoot": true,
 *     "hasDescriptions": true,
 *     "allDescriptionsHaveAbout": true,
 *     "tripleCount": 38,
 *     "subjectUris": ["http://..."]
 *   },
 *   "errors": []
 * }
 */
const validateXml = async (req, res, next) => {
  try {
    const { disNo } = req.params;

    // ── 1. Fetch document ────────────────────────────────────────────────────
    const doc = await findByDisNo(disNo);
    if (!doc) {
      return next(new AppError(`Disaster record not found: ${disNo}`, 404));
    }

    // ── 2. Build XML ─────────────────────────────────────────────────────────
    const xml = buildDisasterRdfXml(doc, null);

    // ── 3. Validate ──────────────────────────────────────────────────────────
    const result = validateRdfXml(xml);

    // ── 4. Respond ───────────────────────────────────────────────────────────
    res.status(200).json({
      success:  true,
      disNo,
      valid:    result.valid,
      checks:   result.checks,
      errors:   result.errors,
    });

  } catch (err) {
    next(err);
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  exportSingleXml,
  exportBatchXml,
  validateXml,
};
