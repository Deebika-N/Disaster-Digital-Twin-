const DisasterRecord = require("../models/mongo/DisasterRecord.model");
const DisasterGraph  = require("../models/neo4j/DisasterGraph.model");
const AppError       = require("../utils/AppError");
const logger         = require("../utils/logger");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a MongoDB filter object from query params.
 * Handles the real field names from disasters_normalized.
 */
const buildFilter = (query) => {
  const {
    type, subtype, group, subgroup,
    country, iso, region, subregion,
    startYear, endYear,
    historic, appeal, declaration,
    minDeaths, maxDeaths,
    minAffected,
    search,
  } = query;

  const filter = {};

  if (type)      filter["Disaster Type"]     = new RegExp(`^${type}$`, "i");
  if (subtype)   filter["Disaster Subtype"]  = new RegExp(subtype, "i");
  if (group)     filter["Disaster Group"]    = new RegExp(`^${group}$`, "i");
  if (subgroup)  filter["Disaster Subgroup"] = new RegExp(`^${subgroup}$`, "i");
  if (country)   filter["Country"]           = new RegExp(country, "i");
  if (iso)       filter["ISO"]               = iso.toUpperCase();
  if (region)    filter["Region"]            = new RegExp(`^${region}$`, "i");
  if (subregion) filter["Subregion"]         = new RegExp(subregion, "i");
  if (historic)  filter["Historic"]          = historic === "true" ? "Yes" : "No";
  if (appeal)    filter["Appeal"]            = appeal === "true" ? "Yes" : "No";
  if (declaration) filter["Declaration"]     = declaration === "true" ? "Yes" : "No";

  // Year range
  if (startYear || endYear) {
    filter["Start Year"] = {};
    if (startYear) filter["Start Year"].$gte = parseInt(startYear);
    if (endYear)   filter["Start Year"].$lte = parseInt(endYear);
  }

  // Deaths range
  if (minDeaths || maxDeaths) {
    filter["Total Deaths"] = {};
    if (minDeaths) filter["Total Deaths"].$gte = parseInt(minDeaths);
    if (maxDeaths) filter["Total Deaths"].$lte = parseInt(maxDeaths);
  }

  if (minAffected) {
    filter["Total Affected"] = { $gte: parseInt(minAffected) };
  }

  // Full-text search on Location + Country
  if (search) {
    filter.$or = [
      { "Location": new RegExp(search, "i") },
      { "Country":  new RegExp(search, "i") },
      { "Origin":   new RegExp(search, "i") },
    ];
  }

  return filter;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/disasters
 * List disasters with full filtering, sorting, pagination
 */
const getDisasters = async (req, res, next) => {
  try {
    const {
      page  = 1,
      limit = 20,
      sort  = "-Start Year",
      fields,
    } = req.query;

    const filter     = buildFilter(req.query);
    const skip       = (parseInt(page) - 1) * parseInt(limit);
    const sortField  = sort.startsWith("-") ? { [sort.slice(1)]: -1 } : { [sort]: 1 };
    const projection = fields
      ? fields.split(",").reduce((acc, f) => { acc[f.trim()] = 1; return acc; }, {})
      : {};

    const [total, disasters] = await Promise.all([
      DisasterRecord.countDocuments(filter),
      DisasterRecord.find(filter, projection)
        .sort(sortField)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        disasters,
        pagination: {
          total,
          page:  parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/disasters/stats
 * Summary statistics for the whole collection
 */
const getStats = async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);

    const [
      typeDist, regionDist, yearDist, impactStats
    ] = await Promise.all([
      // Distribution by type
      DisasterRecord.aggregate([
        { $match: filter },
        { $group: { _id: "$Disaster Type", count: { $sum: 1 }, totalDeaths: { $sum: "$Total Deaths" }, totalAffected: { $sum: "$Total Affected" } } },
        { $sort: { count: -1 } },
      ]),
      // Distribution by region
      DisasterRecord.aggregate([
        { $match: filter },
        { $group: { _id: "$Region", count: { $sum: 1 }, totalDeaths: { $sum: "$Total Deaths" } } },
        { $sort: { count: -1 } },
      ]),
      // Trend by start year
      DisasterRecord.aggregate([
        { $match: filter },
        { $group: { _id: "$Start Year", count: { $sum: 1 }, totalDeaths: { $sum: "$Total Deaths" }, totalAffected: { $sum: "$Total Affected" } } },
        { $sort: { _id: 1 } },
      ]),
      // Overall impact
      DisasterRecord.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalEvents:   { $sum: 1 },
            totalDeaths:   { $sum: "$Total Deaths" },
            totalAffected: { $sum: "$Total Affected" },
            totalDamageK:  { $sum: "$Total Damage ('000 US$)" },
            avgDeaths:     { $avg: "$Total Deaths" },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary:         impactStats[0] || {},
        byType:          typeDist,
        byRegion:        regionDist,
        byYear:          yearDist,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/disasters/:id
 * Single disaster record by MongoDB _id, with Neo4j enrichment
 */
const getDisaster = async (req, res, next) => {
  try {
    const { id } = req.params;
    const disaster = await DisasterRecord.findById(id).lean();
    if (!disaster) return next(new AppError(`Disaster not found: ${id}`, 404));

    // Enrich with Neo4j graph data
    let graphData = null;
    try {
      // eventKey in Neo4j looks like "{'': '2025-0750-AFG'}"
      // Try to match via DisNo. field or construct eventKey
      const disNo = disaster["DisNo."] || "";
      if (disNo) {
        const eventKey = `{'': '${disNo}'}`;
        graphData = await DisasterGraph.getRecordWithRelations(eventKey);
      }
    } catch (graphErr) {
      logger.warn("Neo4j enrichment skipped:", graphErr.message);
    }

    res.status(200).json({ success: true, data: { disaster, graphData } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/disasters/deadliest
 * Top N deadliest disasters — served from Neo4j
 */
const getDeadliest = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const disasters = await DisasterGraph.getDeadliestEvents(parseInt(limit));
    res.status(200).json({ success: true, data: { disasters } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/disasters/map
 * All disasters with lat/lng for map rendering (lightweight)
 */
const getMapData = async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);
    filter["Latitude"]  = { $exists: true, $ne: null };
    filter["Longitude"] = { $exists: true, $ne: null };

    const disasters = await DisasterRecord.find(filter, {
      "DisNo.": 1,
      "Disaster Type": 1,
      "Country": 1,
      "ISO": 1,
      "Latitude": 1,
      "Longitude": 1,
      "Start Year": 1,
      "Total Deaths": 1,
      "Total Affected": 1,
    }).lean();

    res.status(200).json({ success: true, data: { disasters, count: disasters.length } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/disasters/types
 * All distinct disaster types/subgroups/groups
 */
const getDisasterTypes = async (req, res, next) => {
  try {
    const [groups, subgroups, types, subtypes] = await Promise.all([
      DisasterRecord.distinct("Disaster Group"),
      DisasterRecord.distinct("Disaster Subgroup"),
      DisasterRecord.distinct("Disaster Type"),
      DisasterRecord.distinct("Disaster Subtype"),
    ]);
    res.status(200).json({ success: true, data: { groups, subgroups, types, subtypes } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/disasters/regions
 * All distinct regions, subregions, countries
 */
const getRegions = async (req, res, next) => {
  try {
    const [regions, subregions, countries] = await Promise.all([
      DisasterRecord.distinct("Region"),
      DisasterRecord.distinct("Subregion"),
      DisasterRecord.aggregate([
        { $group: { _id: "$ISO", country: { $first: "$Country" }, region: { $first: "$Region" } } },
        { $sort: { country: 1 } },
      ]),
    ]);
    res.status(200).json({ success: true, data: { regions, subregions, countries } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDisasters,
  getStats,
  getDisaster,
  getDeadliest,
  getMapData,
  getDisasterTypes,
  getRegions,
};

