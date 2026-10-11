const neo4j    = require("neo4j-driver");
const { runQuery } = require("../../config/neo4j");

/**
 * Safely convert a Neo4j integer (or {low,high} object) to a JS number.
 * For values that exceed Number.MAX_SAFE_INTEGER this returns a string.
 */
const toNum = (v) => {
  if (v === null || v === undefined) return null;
  if (neo4j.isInt(v)) return v.toNumber();
  if (typeof v === "object" && "low" in v && "high" in v) {
    return neo4j.int(v.low, v.high).toNumber();
  }
  return v;
};

/**
 * Neo4j graph queries — mirrors the actual schema discovered:
 *
 *  Nodes:
 *    (DisasterRecord)  – eventKey, totalDeaths, totalAffected, origin, startYear, appeal, declaration
 *    (Country)         – key (ISO), iso, name, region, subregion
 *    (DisasterType)    – name
 *    (Year)            – value
 *
 *  Relationships:
 *    (DisasterRecord)-[:OCCURRED_IN]   ->(Country)
 *    (DisasterRecord)-[:HAS_TYPE]      ->(DisasterType)
 *    (DisasterRecord)-[:IN_YEAR]       ->(Year)
 *    (DisasterType)  -[:ASSOCIATED_WITH]->(DisasterType)
 */
const DisasterGraph = {
  // ── DisasterRecord Queries ─────────────────────────────────────────────────

  /** Get a single DisasterRecord with all related nodes */
  getRecordWithRelations: async (eventKey) => {
    const query = `
      MATCH (d:DisasterRecord {eventKey: $eventKey})
      OPTIONAL MATCH (d)-[:OCCURRED_IN]->(c:Country)
      OPTIONAL MATCH (d)-[:HAS_TYPE]->(t:DisasterType)
      OPTIONAL MATCH (d)-[:IN_YEAR]->(y:Year)
      RETURN d, c, t, y
    `;
    const result = await runQuery(query, { eventKey }, "READ");
    if (!result.records.length) return null;
    const rec = result.records[0];
    const toProps = (node) => (node ? node.properties : null);
    return {
      record:  toProps(rec.get("d")),
      country: toProps(rec.get("c")),
      type:    toProps(rec.get("t")),
      year:    toProps(rec.get("y")),
    };
  },

  /** Get all DisasterRecords for a country (ISO code) */
  getRecordsByCountry: async (iso, limit = 50) => {
    const query = `
      MATCH (d:DisasterRecord)-[:OCCURRED_IN]->(c:Country {iso: $iso})
      OPTIONAL MATCH (d)-[:HAS_TYPE]->(t:DisasterType)
      OPTIONAL MATCH (d)-[:IN_YEAR]->(y:Year)
      RETURN d, c, t.name AS disasterType, y.value AS year
      ORDER BY d.startYear DESC
      LIMIT toInteger($limit)
    `;
    const result = await runQuery(query, { iso, limit }, "READ");
    return result.records.map((r) => ({
      ...r.get("d").properties,
      disasterType: r.get("disasterType"),
      year: r.get("year"),
    }));
  },

  /** Get all DisasterRecords for a given year */
  getRecordsByYear: async (year) => {
    const query = `
      MATCH (d:DisasterRecord)-[:IN_YEAR]->(y:Year {value: toInteger($year)})
      OPTIONAL MATCH (d)-[:OCCURRED_IN]->(c:Country)
      OPTIONAL MATCH (d)-[:HAS_TYPE]->(t:DisasterType)
      RETURN d, c.name AS country, c.iso AS iso, t.name AS disasterType
      ORDER BY d.totalDeaths DESC
    `;
    const result = await runQuery(query, { year: parseInt(year) }, "READ");
    return result.records.map((r) => ({
      ...r.get("d").properties,
      country: r.get("country"),
      iso: r.get("iso"),
      disasterType: r.get("disasterType"),
    }));
  },

  /** Get all DisasterRecords of a given type */
  getRecordsByType: async (typeName, limit = 100) => {
    const query = `
      MATCH (d:DisasterRecord)-[:HAS_TYPE]->(t:DisasterType {name: $typeName})
      OPTIONAL MATCH (d)-[:OCCURRED_IN]->(c:Country)
      OPTIONAL MATCH (d)-[:IN_YEAR]->(y:Year)
      RETURN d, c.name AS country, c.iso AS iso, y.value AS year
      ORDER BY d.startYear DESC
      LIMIT toInteger($limit)
    `;
    const result = await runQuery(query, { typeName, limit }, "READ");
    return result.records.map((r) => ({
      ...r.get("d").properties,
      country: r.get("country"),
      iso: r.get("iso"),
      year: r.get("year"),
    }));
  },

  // ── Country Queries ────────────────────────────────────────────────────────

  /** Get all countries */
  getAllCountries: async () => {
    const query = `
      MATCH (c:Country)
      RETURN c
      ORDER BY c.name
    `;
    const result = await runQuery(query, {}, "READ");
    return result.records.map((r) => r.get("c").properties);
  },

  /** Get country with disaster statistics */
  getCountryWithStats: async (iso) => {
    const query = `
      MATCH (c:Country {iso: $iso})
      OPTIONAL MATCH (d:DisasterRecord)-[:OCCURRED_IN]->(c)
      RETURN c,
             count(d) AS totalEvents,
             sum(d.totalDeaths) AS totalDeaths,
             sum(d.totalAffected) AS totalAffected
    `;
    const result = await runQuery(query, { iso }, "READ");
    if (!result.records.length) return null;
    const rec = result.records[0];
    return {
      ...rec.get("c").properties,
      totalEvents:   rec.get("totalEvents").toNumber(),
      totalDeaths:   rec.get("totalDeaths"),
      totalAffected: rec.get("totalAffected"),
    };
  },

  /** Top N most affected countries */
  getMostAffectedCountries: async (limit = 10, metric = "totalDeaths") => {
    const orderField = metric === "totalAffected" ? "d.totalAffected" : "d.totalDeaths";
    const query = `
      MATCH (d:DisasterRecord)-[:OCCURRED_IN]->(c:Country)
      RETURN c.name AS country, c.iso AS iso, c.region AS region,
             count(d) AS eventCount,
             sum(d.totalDeaths) AS totalDeaths,
             sum(d.totalAffected) AS totalAffected
      ORDER BY sum(${orderField}) DESC
      LIMIT toInteger($limit)
    `;
    const result = await runQuery(query, { limit }, "READ");
    return result.records.map((r) => ({
      country: r.get("country"),
      iso: r.get("iso"),
      region: r.get("region"),
      eventCount: r.get("eventCount").toNumber(),
      totalDeaths: r.get("totalDeaths"),
      totalAffected: r.get("totalAffected"),
    }));
  },

  // ── DisasterType Queries ───────────────────────────────────────────────────

  /** Get all disaster types */
  getAllTypes: async () => {
    const query = `
      MATCH (t:DisasterType)
      OPTIONAL MATCH (d:DisasterRecord)-[:HAS_TYPE]->(t)
      RETURN t.name AS name, count(d) AS eventCount
      ORDER BY eventCount DESC
    `;
    const result = await runQuery(query, {}, "READ");
    return result.records.map((r) => ({
      name: r.get("name"),
      eventCount: r.get("eventCount").toNumber(),
    }));
  },

  /** Get DisasterTypes associated with a given type (co-occurring in same subgroup) */
  getRelatedTypes: async (typeName) => {
    const query = `
      MATCH (t:DisasterType {name: $typeName})-[:ASSOCIATED_WITH]-(related:DisasterType)
      RETURN related.name AS name
    `;
    const result = await runQuery(query, { typeName }, "READ");
    return result.records.map((r) => r.get("name"));
  },

  // ── Year Queries ───────────────────────────────────────────────────────────

  /** Get all years with event counts */
  getYearTimeline: async () => {
    const query = `
      MATCH (y:Year)<-[:IN_YEAR]-(d:DisasterRecord)
      RETURN y.value AS year,
             count(d) AS eventCount,
             sum(d.totalDeaths) AS totalDeaths,
             sum(d.totalAffected) AS totalAffected
      ORDER BY year ASC
    `;
    const result = await runQuery(query, {}, "READ");
    return result.records.map((r) => ({
      year: r.get("year").toNumber(),
      eventCount: r.get("eventCount").toNumber(),
      totalDeaths: r.get("totalDeaths"),
      totalAffected: r.get("totalAffected"),
    }));
  },

  // ── Analytics / Aggregations ───────────────────────────────────────────────

  /** Disaster type breakdown per region */
  getTypesByRegion: async (region) => {
    const query = `
      MATCH (d:DisasterRecord)-[:OCCURRED_IN]->(c:Country {region: $region})
      MATCH (d)-[:HAS_TYPE]->(t:DisasterType)
      RETURN t.name AS type,
             count(d) AS eventCount,
             sum(d.totalDeaths) AS totalDeaths
      ORDER BY eventCount DESC
    `;
    const result = await runQuery(query, { region }, "READ");
    return result.records.map((r) => ({
      type: r.get("type"),
      eventCount: r.get("eventCount").toNumber(),
      totalDeaths: r.get("totalDeaths"),
    }));
  },

  /** Deadliest disasters overall */
  getDeadliestEvents: async (limit = 10) => {
    const query = `
      MATCH (d:DisasterRecord)-[:OCCURRED_IN]->(c:Country)
      MATCH (d)-[:HAS_TYPE]->(t:DisasterType)
      MATCH (d)-[:IN_YEAR]->(y:Year)
      WHERE d.totalDeaths IS NOT NULL
      RETURN d, c.name AS country, t.name AS type, y.value AS year
      ORDER BY d.totalDeaths DESC
      LIMIT toInteger($limit)
    `;
    const result = await runQuery(query, { limit }, "READ");
    return result.records.map((r) => ({
      ...r.get("d").properties,
      country: r.get("country"),
      type: r.get("type"),
      year: r.get("year"),
    }));
  },

  /** Graph overview counts */
  getGraphOverview: async () => {
    const query = `
      MATCH (n)
      RETURN labels(n)[0] AS label, count(n) AS count
      ORDER BY count DESC
    `;
    const relQuery = `
      MATCH ()-[r]->()
      RETURN type(r) AS rel, count(r) AS count
      ORDER BY count DESC
    `;
    const [nodeResult, relResult] = await Promise.all([
      runQuery(query, {}, "READ"),
      runQuery(relQuery, {}, "READ"),
    ]);
    return {
      nodes: nodeResult.records.map((r) => ({
        label: r.get("label"),
        count: r.get("count").toNumber(),
      })),
      relationships: relResult.records.map((r) => ({
        type: r.get("rel"),
        count: r.get("count").toNumber(),
      })),
    };
  },

  /** Safe custom read-only Cypher query */
  executeReadQuery: async (query, params = {}) => {
    const upper = query.trim().toUpperCase();
    const blocked = ["CREATE", "MERGE", "DELETE", "DETACH", "SET", "REMOVE", "DROP"];
    if (blocked.some((kw) => upper.includes(kw))) {
      throw new Error("Only read-only queries are permitted.");
    }
    const result = await runQuery(query, params, "READ");
    return result.records.map((r) => r.toObject());
  },
};

module.exports = DisasterGraph;

