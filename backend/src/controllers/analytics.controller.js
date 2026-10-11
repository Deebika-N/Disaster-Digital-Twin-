const DisasterRecord = require("../models/mongo/DisasterRecord.model");
const DisasterGraph  = require("../models/neo4j/DisasterGraph.model");
const logger         = require("../utils/logger");

/**
 * GET /api/v1/analytics/dashboard
 * High-level KPIs for the dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const [summary, byType, byRegion, recentYear] = await Promise.all([
      // Overall totals
      DisasterRecord.aggregate([
        {
          $group: {
            _id: null,
            totalEvents:   { $sum: 1 },
            totalDeaths:   { $sum: "$Total Deaths" },
            totalAffected: { $sum: "$Total Affected" },
            totalDamageK:  { $sum: "$Total Damage ('000 US$)" },
          },
        },
      ]),
      // Events by disaster type
      DisasterRecord.aggregate([
        { $group: { _id: "$Disaster Type", count: { $sum: 1 }, totalDeaths: { $sum: "$Total Deaths" } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // Events by region
      DisasterRecord.aggregate([
        { $group: { _id: "$Region", count: { $sum: 1 }, totalDeaths: { $sum: "$Total Deaths" }, totalAffected: { $sum: "$Total Affected" } } },
        { $sort: { count: -1 } },
      ]),
      // Last year's data
      DisasterRecord.aggregate([
        { $match: { "Start Year": new Date().getFullYear() - 1 } },
        {
          $group: {
            _id: null,
            events: { $sum: 1 },
            deaths: { $sum: "$Total Deaths" },
            affected: { $sum: "$Total Affected" },
          },
        },
      ]),
    ]);

    // Year timeline from Neo4j
    let yearTimeline = [];
    try {
      yearTimeline = await DisasterGraph.getYearTimeline();
    } catch (e) {
      logger.warn("Neo4j year timeline failed:", e.message);
    }

    res.status(200).json({
      success: true,
      data: {
        summary:      summary[0] || {},
        byType,
        byRegion,
        lastYear:     recentYear[0] || {},
        yearTimeline,
        generatedAt:  new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/analytics/timeline
 * Disasters per year with deaths + affected (MongoDB aggregation)
 */
const getTimeline = async (req, res, next) => {
  try {
    const { type, region, iso, startYear, endYear } = req.query;
    const match = {};
    if (type)      match["Disaster Type"] = new RegExp(`^${type}$`, "i");
    if (region)    match["Region"]        = new RegExp(`^${region}$`, "i");
    if (iso)       match["ISO"]           = iso.toUpperCase();
    if (startYear) match["Start Year"]    = { ...(match["Start Year"] || {}), $gte: parseInt(startYear) };
    if (endYear)   match["Start Year"]    = { ...(match["Start Year"] || {}), $lte: parseInt(endYear) };

    const timeline = await DisasterRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id:           "$Start Year",
          eventCount:    { $sum: 1 },
          totalDeaths:   { $sum: "$Total Deaths" },
          totalAffected: { $sum: "$Total Affected" },
          totalDamageK:  { $sum: "$Total Damage ('000 US$)" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id:           0,
          year:          "$_id",
          eventCount:    1,
          totalDeaths:   1,
          totalAffected: 1,
          totalDamageK:  1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: { timeline } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/analytics/country/:iso
 * Full country profile — MongoDB + Neo4j
 */
const getCountryProfile = async (req, res, next) => {
  try {
    const iso = req.params.iso.toUpperCase();

    const [mongoStats, typeBreakdown, yearBreakdown] = await Promise.all([
      DisasterRecord.aggregate([
        { $match: { ISO: iso } },
        {
          $group: {
            _id: null,
            totalEvents:   { $sum: 1 },
            totalDeaths:   { $sum: "$Total Deaths" },
            totalAffected: { $sum: "$Total Affected" },
            totalDamageK:  { $sum: "$Total Damage ('000 US$)" },
          },
        },
      ]),
      DisasterRecord.aggregate([
        { $match: { ISO: iso } },
        { $group: { _id: "$Disaster Type", count: { $sum: 1 }, deaths: { $sum: "$Total Deaths" } } },
        { $sort: { count: -1 } },
      ]),
      DisasterRecord.aggregate([
        { $match: { ISO: iso } },
        { $group: { _id: "$Start Year", count: { $sum: 1 }, deaths: { $sum: "$Total Deaths" } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Graph stats from Neo4j
    let graphStats = null;
    try {
      graphStats = await DisasterGraph.getCountryWithStats(iso);
    } catch (e) {
      logger.warn("Neo4j country profile failed:", e.message);
    }

    res.status(200).json({
      success: true,
      data: {
        iso,
        summary:       mongoStats[0] || {},
        byType:        typeBreakdown,
        byYear:        yearBreakdown,
        graphStats,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/analytics/top-countries
 * Top countries by deaths or affected — from Neo4j
 */
const getTopCountries = async (req, res, next) => {
  try {
    const { limit = 10, metric = "totalDeaths" } = req.query;
    const countries = await DisasterGraph.getMostAffectedCountries(parseInt(limit), metric);
    res.status(200).json({ success: true, data: { countries } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/analytics/heatmap
 * Aggregated data per country for choropleth map
 */
const getHeatmapData = async (req, res, next) => {
  try {
    const { startYear, endYear, type } = req.query;
    const match = {};
    if (startYear) match["Start Year"] = { $gte: parseInt(startYear) };
    if (endYear)   match["Start Year"] = { ...(match["Start Year"] || {}), $lte: parseInt(endYear) };
    if (type)      match["Disaster Type"] = new RegExp(`^${type}$`, "i");

    const heatmap = await DisasterRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id:           "$ISO",
          country:       { $first: "$Country" },
          region:        { $first: "$Region" },
          eventCount:    { $sum: 1 },
          totalDeaths:   { $sum: "$Total Deaths" },
          totalAffected: { $sum: "$Total Affected" },
          totalDamageK:  { $sum: "$Total Damage ('000 US$)" },
        },
      },
      { $sort: { totalDeaths: -1 } },
    ]);

    res.status(200).json({ success: true, data: { heatmap } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/analytics/type-comparison
 * Compare two or more disaster types over time
 */
const getTypeComparison = async (req, res, next) => {
  try {
    const { types } = req.query; // comma-separated
    if (!types) return next(new (require("../utils/AppError"))("types query param required", 400));

    const typeList = types.split(",").map((t) => t.trim());

    const data = await DisasterRecord.aggregate([
      { $match: { "Disaster Type": { $in: typeList } } },
      {
        $group: {
          _id: { type: "$Disaster Type", year: "$Start Year" },
          count:         { $sum: 1 },
          totalDeaths:   { $sum: "$Total Deaths" },
          totalAffected: { $sum: "$Total Affected" },
        },
      },
      { $sort: { "_id.year": 1 } },
    ]);

    res.status(200).json({ success: true, data: { comparison: data } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard,
  getTimeline,
  getCountryProfile,
  getTopCountries,
  getHeatmapData,
  getTypeComparison,
};

