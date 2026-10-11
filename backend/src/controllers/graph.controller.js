const DisasterGraph = require("../models/neo4j/DisasterGraph.model");
const AppError      = require("../utils/AppError");

/**
 * GET /api/v1/graph/overview
 * Node and relationship counts
 */
const getOverview = async (req, res, next) => {
  try {
    const overview = await DisasterGraph.getGraphOverview();
    res.status(200).json({ success: true, data: overview });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/graph/countries
 * All Country nodes
 */
const getCountries = async (req, res, next) => {
  try {
    const countries = await DisasterGraph.getAllCountries();
    res.status(200).json({ success: true, data: { countries, count: countries.length } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/graph/types
 * All DisasterType nodes with event counts
 */
const getTypes = async (req, res, next) => {
  try {
    const types = await DisasterGraph.getAllTypes();
    res.status(200).json({ success: true, data: { types } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/graph/types/:name/related
 * DisasterTypes associated with a given type
 */
const getRelatedTypes = async (req, res, next) => {
  try {
    const { name } = req.params;
    const related = await DisasterGraph.getRelatedTypes(name);
    res.status(200).json({ success: true, data: { type: name, related } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/graph/country/:iso
 * Country node with disaster stats
 */
const getCountry = async (req, res, next) => {
  try {
    const iso = req.params.iso.toUpperCase();
    const country = await DisasterGraph.getCountryWithStats(iso);
    if (!country) return next(new AppError(`Country not found: ${iso}`, 404));
    res.status(200).json({ success: true, data: { country } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/graph/country/:iso/disasters
 * Disasters for a country from Neo4j
 */
const getCountryDisasters = async (req, res, next) => {
  try {
    const iso   = req.params.iso.toUpperCase();
    const limit = parseInt(req.query.limit) || 50;
    const disasters = await DisasterGraph.getRecordsByCountry(iso, limit);
    res.status(200).json({ success: true, data: { iso, disasters, count: disasters.length } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/graph/year/:year
 * Disasters for a given year from Neo4j
 */
const getYearDisasters = async (req, res, next) => {
  try {
    const { year } = req.params;
    const disasters = await DisasterGraph.getRecordsByYear(year);
    res.status(200).json({ success: true, data: { year: parseInt(year), disasters, count: disasters.length } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/graph/timeline
 * Year nodes with aggregated counts — from Neo4j
 */
const getTimeline = async (req, res, next) => {
  try {
    const timeline = await DisasterGraph.getYearTimeline();
    res.status(200).json({ success: true, data: { timeline } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/graph/deadliest
 * Top N deadliest events — from Neo4j
 */
const getDeadliest = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const disasters = await DisasterGraph.getDeadliestEvents(limit);
    res.status(200).json({ success: true, data: { disasters } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/graph/region/:region/types
 * Disaster type breakdown for a region
 */
const getRegionTypeBreakdown = async (req, res, next) => {
  try {
    const { region } = req.params;
    const data = await DisasterGraph.getTypesByRegion(region);
    res.status(200).json({ success: true, data: { region, breakdown: data } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/graph/query
 * Safe custom read-only Cypher query (admin/analyst only)
 */
const executeQuery = async (req, res, next) => {
  try {
    const { query, params = {} } = req.body;
    if (!query) return next(new AppError("Cypher query is required.", 400));
    const results = await DisasterGraph.executeReadQuery(query, params);
    res.status(200).json({ success: true, data: { results, count: results.length } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};

