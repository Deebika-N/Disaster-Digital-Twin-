const express = require("express");
const {
  getDisasters,
  getStats,
  getDisaster,
  getDeadliest,
  getMapData,
  getDisasterTypes,
  getRegions,
} = require("../controllers/disaster.controller");

const router = express.Router();

// Metadata routes (before /:id to avoid conflicts)
router.get("/types",    getDisasterTypes);
router.get("/regions",  getRegions);
router.get("/stats",    getStats);
router.get("/deadliest", getDeadliest);
router.get("/map",      getMapData);

// Main collection + single record
router.get("/",   getDisasters);
router.get("/:id", getDisaster);

module.exports = router;

