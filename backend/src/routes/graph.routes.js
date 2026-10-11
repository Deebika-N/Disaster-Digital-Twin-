const express = require("express");
const {
  getOverview,
  getCountries,
  getTypes,
  getRelatedTypes,
  getCountry,
  getCountryDisasters,
  getYearDisasters,
  getTimeline,
  getDeadliest,
  getRegionTypeBreakdown,
  executeQuery,
} = require("../controllers/graph.controller");

const router = express.Router();

router.get("/overview",                   getOverview);
router.get("/countries",                  getCountries);
router.get("/timeline",                   getTimeline);
router.get("/deadliest",                  getDeadliest);
router.get("/types",                      getTypes);
router.get("/types/:name/related",        getRelatedTypes);
router.get("/country/:iso",               getCountry);
router.get("/country/:iso/disasters",     getCountryDisasters);
router.get("/year/:year",                 getYearDisasters);
router.get("/region/:region/types",       getRegionTypeBreakdown);
router.post("/query",                     executeQuery);   // admin/analyst only

module.exports = router;

