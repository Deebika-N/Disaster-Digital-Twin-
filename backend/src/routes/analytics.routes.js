const express = require("express");
const {
  getDashboard,
  getTimeline,
  getCountryProfile,
  getTopCountries,
  getHeatmapData,
  getTypeComparison,
} = require("../controllers/analytics.controller");

const router = express.Router();

router.get("/dashboard",        getDashboard);
router.get("/timeline",         getTimeline);
router.get("/top-countries",    getTopCountries);
router.get("/heatmap",          getHeatmapData);
router.get("/type-comparison",  getTypeComparison);
router.get("/country/:iso",     getCountryProfile);

module.exports = router;

