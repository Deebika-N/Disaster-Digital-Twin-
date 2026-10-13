"use strict";

/**
 * xml.routes.js
 *
 * RDF/XML export and validation routes.
 * Mounted at: /api/v1/xml
 *
 * Routes:
 *   GET /api/v1/xml/disaster/:disNo   — Single record as RDF/XML
 *   GET /api/v1/xml/export            — Batch records as RDF/XML (filters via query params)
 *   GET /api/v1/xml/validate/:disNo   — Validate a record's RDF/XML (returns JSON)
 *
 * All routes are read-only. No database writes occur.
 */

const express = require("express");
const {
  exportSingleXml,
  exportBatchXml,
  validateXml,
} = require("../controllers/xml.controller");

const router = express.Router();

// Single record export — must come before batch to avoid param conflicts
router.get("/disaster/:disNo", exportSingleXml);

// Batch export with optional filters
router.get("/export", exportBatchXml);

// Validation report (JSON) — no XML streamed
router.get("/validate/:disNo", validateXml);

module.exports = router;
