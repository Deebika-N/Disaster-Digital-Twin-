"use strict";

/**
 * rdfXmlBuilder.js
 *
 * Pure utility — zero database calls.
 * Converts MongoDB disaster documents (and optional Neo4j graph enrichment)
 * into valid RDF/XML documents using subject-predicate-object triples.
 *
 * Namespaces:
 *   ddt:   http://disaster-digital-twin.local/ontology#      (disaster predicates)
 *   data:  http://disaster-digital-twin.local/data/          (subject URIs)
 *   geo:   http://www.w3.org/2003/01/geo/wgs84_pos#          (W3C Geo)
 *   xsd:   http://www.w3.org/2001/XMLSchema#                 (datatypes)
 *   rdf:   http://www.w3.org/1999/02/22-rdf-syntax-ns#      (RDF core)
 *
 * NOTE: Element and attribute names passed to xmlbuilder2 must be
 * prefixed QNames (e.g. "rdf:Description", "ddt:totalDeaths").
 * Full namespace URLs are only used as VALUES (rdf:about, rdf:resource,
 * rdf:datatype) and in the xmlns declarations on the root element.
 */

const { create } = require("xmlbuilder2");

// ─── Namespace constants ──────────────────────────────────────────────────────

const NS = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  ddt: "http://disaster-digital-twin.local/ontology#",
  data: "http://disaster-digital-twin.local/data/",
  geo: "http://www.w3.org/2003/01/geo/wgs84_pos#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

const XSD = {
  string: `${NS.xsd}string`,
  integer: `${NS.xsd}integer`,
  decimal: `${NS.xsd}decimal`,
  boolean: `${NS.xsd}boolean`,
  dateTime: `${NS.xsd}dateTime`,
};

/** Root element attributes declaring every prefix used in the document */
function rootAttributes() {
  return {
    "xmlns:rdf": NS.rdf,
    "xmlns:ddt": NS.ddt,
    "xmlns:data": NS.data,
    "xmlns:geo": NS.geo,
    "xmlns:xsd": NS.xsd,
  };
}

// ─── ID extraction ────────────────────────────────────────────────────────────

/**
 * Extract a stable, clean disaster code from a MongoDB document.
 *
 * Priority chain (verified from live database inspection):
 *   1. doc.DisNo[""]        — live format: { "": "2025-0750-AFG" }
 *   2. doc["DisNo."]        — schema fallback (string field)
 *   3. String(doc._id)      — last resort: MongoDB ObjectId
 *
 * @param {object} doc - Raw MongoDB document
 * @returns {string} - Clean code, e.g. "2025-0750-AFG"
 */
function extractDisasterCode(doc) {
  if (
    doc.DisNo &&
    typeof doc.DisNo === "object" &&
    !Array.isArray(doc.DisNo) &&
    doc.DisNo[""] !== undefined &&
    doc.DisNo[""] !== null &&
    String(doc.DisNo[""]).trim() !== ""
  ) {
    return String(doc.DisNo[""]).trim();
  }

  if (doc["DisNo."] && typeof doc["DisNo."] === "string" && doc["DisNo."].trim() !== "") {
    return doc["DisNo."].trim();
  }

  return String(doc._id);
}

// ─── XML escaping ─────────────────────────────────────────────────────────────

/**
 * Escape special XML characters in a string value.
 * xmlbuilder2 handles this automatically inside element text content,
 * but this helper is used for explicit attribute values and logging.
 *
 * @param {*} value - Any value; will be cast to string
 * @returns {string}
 */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── Safe value checks ────────────────────────────────────────────────────────

/** Returns true when a value should be included as a triple */
function hasValue(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "number") return !Number.isNaN(v);
  if (typeof v === "string") return v.trim() !== "";
  return true;
}

/** Format a date value as xsd:dateTime string */
function toDateTimeString(v) {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return null;
}

// ─── Triple helpers ───────────────────────────────────────────────────────────

/**
 * Add a literal triple to a rdf:Description element.
 *
 * @param {object} desc    - xmlbuilder2 element (rdf:Description)
 * @param {string} pred    - Prefixed predicate name (e.g. "ddt:totalDeaths")
 * @param {*}      value   - The literal value
 * @param {string} xsdType - XSD datatype URI (used as an attribute VALUE)
 */
function addLiteral(desc, pred, value, xsdType) {
  if (!hasValue(value)) return;
  desc
    .ele(pred)
    .att("rdf:datatype", xsdType)
    .txt(String(value));
}

/**
 * Add a resource triple (object is a URI, not a literal).
 *
 * @param {object} desc      - xmlbuilder2 element
 * @param {string} pred      - Prefixed predicate name (e.g. "ddt:occurredIn")
 * @param {string} objectUri - Object URI (used as an attribute VALUE)
 */
function addResource(desc, pred, objectUri) {
  if (!hasValue(objectUri)) return;
  desc.ele(pred).att("rdf:resource", objectUri);
}

// ─── URI builders ─────────────────────────────────────────────────────────────

const uris = {
  disaster: (code) => `${NS.data}${encodeURIComponent(code)}`,
  country: (iso) => `${NS.data}country/${encodeURIComponent(iso)}`,
  disasterType: (name) => `${NS.data}type/${encodeURIComponent(name)}`,
  year: (val) => `${NS.data}year/${encodeURIComponent(val)}`,
  ontology: (term) => `${NS.ddt}${term}`,
};

// ─── Core builder: single document → rdf:Description ─────────────────────────

/**
 * Append a DisasterEvent rdf:Description to an existing rdf:RDF root element.
 *
 * @param {object} rdfRoot  - xmlbuilder2 rdf:RDF element
 * @param {object} doc      - MongoDB document (raw, from .lean())
 * @param {object|null} graphData - Optional Neo4j enrichment from DisasterGraph.getRecordWithRelations()
 *                                  Shape: { record, country, type, year }
 */
function appendDisasterDescription(rdfRoot, doc, graphData = null) {
  const code = extractDisasterCode(doc);
  const subjectUri = uris.disaster(code);

  // ── rdf:Description for the DisasterEvent ──────────────────────────────────
  const desc = rdfRoot
    .ele("rdf:Description")
    .att("rdf:about", subjectUri);

  // rdf:type
  desc.ele("rdf:type").att("rdf:resource", uris.ontology("DisasterEvent"));

  // ── Classification ─────────────────────────────────────────────────────────
  addLiteral(desc, "ddt:hasDisasterGroup", doc["Disaster Group"], XSD.string);
  addLiteral(desc, "ddt:hasDisasterSubgroup", doc["Disaster Subgroup"], XSD.string);
  addLiteral(desc, "ddt:hasDisasterType", doc["Disaster Type"], XSD.string);
  addLiteral(desc, "ddt:hasDisasterSubtype", doc["Disaster Subtype"], XSD.string);
  addLiteral(desc, "ddt:classificationKey", doc["Classification Key"], XSD.string);

  if (hasValue(doc.Historic)) {
    const isHistoric = doc.Historic === "Yes" ? "true" : "false";
    addLiteral(desc, "ddt:isHistoric", isHistoric, XSD.boolean);
  }

  // ── Location ───────────────────────────────────────────────────────────────
  addLiteral(desc, "ddt:countryISO", doc["ISO"], XSD.string);
  addLiteral(desc, "ddt:countryName", doc["Country"], XSD.string);
  addLiteral(desc, "ddt:region", doc["Region"], XSD.string);
  addLiteral(desc, "ddt:subregion", doc["Subregion"], XSD.string);
  addLiteral(desc, "ddt:location", doc["Location"], XSD.string);

  if (hasValue(doc["Latitude"]) && hasValue(doc["Longitude"])) {
    addLiteral(desc, "geo:lat", doc["Latitude"], XSD.decimal);
    addLiteral(desc, "geo:long", doc["Longitude"], XSD.decimal);
  }

  // ── Event details ──────────────────────────────────────────────────────────
  addLiteral(desc, "ddt:origin", doc["Origin"], XSD.string);
  addLiteral(desc, "ddt:externalIdentifier", doc["External IDs"], XSD.string);
  addLiteral(desc, "ddt:magnitude", doc["Magnitude"], XSD.decimal);
  addLiteral(desc, "ddt:magnitudeScale", doc["Magnitude Scale"], XSD.string);

  // ── Timeline ───────────────────────────────────────────────────────────────
  addLiteral(desc, "ddt:startYear", doc["Start Year"], XSD.integer);
  addLiteral(desc, "ddt:startMonth", doc["Start Month"], XSD.integer);
  addLiteral(desc, "ddt:startDay", doc["Start Day"], XSD.integer);
  addLiteral(desc, "ddt:endYear", doc["End Year"], XSD.integer);
  addLiteral(desc, "ddt:endMonth", doc["End Month"], XSD.integer);
  addLiteral(desc, "ddt:endDay", doc["End Day"], XSD.integer);

  const entryDate = toDateTimeString(doc["Entry Date"]);
  if (entryDate) addLiteral(desc, "ddt:entryDate", entryDate, XSD.dateTime);

  const lastUpdate = toDateTimeString(doc["Last Update"]);
  if (lastUpdate) addLiteral(desc, "ddt:lastUpdate", lastUpdate, XSD.dateTime);

  // ── Response flags ─────────────────────────────────────────────────────────
  addLiteral(desc, "ddt:ofdaBhaResponse", doc["OFDA/BHA Response"], XSD.string);
  addLiteral(desc, "ddt:appeal", doc["Appeal"], XSD.string);
  addLiteral(desc, "ddt:declaration", doc["Declaration"], XSD.string);

  // ── Impact metrics ─────────────────────────────────────────────────────────
  addLiteral(desc, "ddt:totalDeaths", doc["Total Deaths"], XSD.integer);
  addLiteral(desc, "ddt:totalAffected", doc["Total Affected"], XSD.integer);

  // Nested "No" object — keys have a leading space (verified from live data)
  const noObj = doc["No"];
  if (noObj && typeof noObj === "object") {
    const injured = noObj[" Injured"];
    const affected = noObj[" Affected"];
    addLiteral(desc, "ddt:injured", injured, XSD.integer);
    addLiteral(desc, "ddt:reportedAffected", affected, XSD.integer);
  }

  // Also include top-level fields if present (schema defines them)
  addLiteral(desc, "ddt:noInjured", doc["No. Injured"], XSD.integer);
  addLiteral(desc, "ddt:noAffected", doc["No. Affected"], XSD.integer);

  addLiteral(desc, "ddt:totalDamageThousandUSD",
    doc["Total Damage ('000 US$)"], XSD.decimal);
  addLiteral(desc, "ddt:totalDamageAdjustedThousandUSD",
    doc["Total Damage, Adjusted ('000 US$)"], XSD.decimal);
  addLiteral(desc, "ddt:cpi", doc["CPI"], XSD.decimal);

  // ── Graph relationships (from Neo4j enrichment) ────────────────────────────
  if (graphData) {
    const { country, type, year } = graphData;

    if (country && hasValue(country.iso)) {
      addResource(desc, "ddt:occurredIn", uris.country(country.iso));
    }
    if (type && hasValue(type.name)) {
      addResource(desc, "ddt:hasType", uris.disasterType(type.name));
    }
    if (year && hasValue(year.value)) {
      const yVal = year.value && typeof year.value === "object" && "low" in year.value
        ? year.value.low   // Neo4j integer objects
        : year.value;
      addResource(desc, "ddt:inYear", uris.year(yVal));
    }
  } else {
    // Fallback: derive URIs from MongoDB fields so structure stays consistent
    if (hasValue(doc["ISO"])) {
      addResource(desc, "ddt:occurredIn", uris.country(doc["ISO"]));
    }
    if (hasValue(doc["Disaster Type"])) {
      addResource(desc, "ddt:hasType", uris.disasterType(doc["Disaster Type"]));
    }
    if (hasValue(doc["Start Year"])) {
      addResource(desc, "ddt:inYear", uris.year(doc["Start Year"]));
    }
  }
}

/**
 * Append a Country rdf:Description to an existing rdf:RDF root element.
 *
 * @param {object} rdfRoot
 * @param {object} countryProps - Neo4j Country node properties or plain {iso, name, region, subregion}
 */
function appendCountryDescription(rdfRoot, countryProps) {
  if (!countryProps || !hasValue(countryProps.iso)) return;

  const desc = rdfRoot
    .ele("rdf:Description")
    .att("rdf:about", uris.country(countryProps.iso));

  desc.ele("rdf:type").att("rdf:resource", uris.ontology("Country"));
  addLiteral(desc, "ddt:iso", countryProps.iso, XSD.string);
  addLiteral(desc, "ddt:name", countryProps.name, XSD.string);
  addLiteral(desc, "ddt:region", countryProps.region, XSD.string);
  addLiteral(desc, "ddt:subregion", countryProps.subregion, XSD.string);
}

/**
 * Append a DisasterType rdf:Description to an existing rdf:RDF root element.
 */
function appendDisasterTypeDescription(rdfRoot, typeName) {
  if (!hasValue(typeName)) return;

  const desc = rdfRoot
    .ele("rdf:Description")
    .att("rdf:about", uris.disasterType(typeName));

  desc.ele("rdf:type").att("rdf:resource", uris.ontology("DisasterType"));
  addLiteral(desc, "ddt:name", typeName, XSD.string);
}

/**
 * Append a Year rdf:Description to an existing rdf:RDF root element.
 */
function appendYearDescription(rdfRoot, yearValue) {
  if (!hasValue(yearValue)) return;

  const desc = rdfRoot
    .ele("rdf:Description")
    .att("rdf:about", uris.year(yearValue));

  desc.ele("rdf:type").att("rdf:resource", uris.ontology("Year"));
  addLiteral(desc, "ddt:value", yearValue, XSD.integer);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a complete RDF/XML document for a single disaster record.
 *
 * @param {object}      doc       - MongoDB document (.lean())
 * @param {object|null} graphData - Neo4j enrichment { record, country, type, year }
 * @returns {string} - Complete, pretty-printed RDF/XML string
 */
function buildDisasterRdfXml(doc, graphData = null) {
  const root = create({ version: "1.0", encoding: "UTF-8" })
    .ele("rdf:RDF", rootAttributes());

  // Main event
  appendDisasterDescription(root, doc, graphData);

  // Related nodes (Country, DisasterType, Year)
  if (graphData) {
    if (graphData.country) appendCountryDescription(root, graphData.country);
    if (graphData.type) appendDisasterTypeDescription(root, graphData.type.name);
    if (graphData.year) {
      const yVal = graphData.year.value && typeof graphData.year.value === "object"
        ? graphData.year.value.low
        : graphData.year.value;
      appendYearDescription(root, yVal);
    }
  } else {
    // Derive stubs from MongoDB data
    if (hasValue(doc["ISO"]) && hasValue(doc["Country"])) {
      appendCountryDescription(root, {
        iso: doc["ISO"],
        name: doc["Country"],
        region: doc["Region"],
        subregion: doc["Subregion"],
      });
    }
    if (hasValue(doc["Disaster Type"])) {
      appendDisasterTypeDescription(root, doc["Disaster Type"]);
    }
    if (hasValue(doc["Start Year"])) {
      appendYearDescription(root, doc["Start Year"]);
    }
  }

  return root.end({ prettyPrint: true });
}

/**
 * Build a batch RDF/XML document for multiple disaster records.
 * For performance, Neo4j enrichment is not included in batch mode —
 * relationships are derived from MongoDB fields only.
 *
 * @param {object[]} docs - Array of MongoDB documents (.lean())
 * @returns {string} - Complete, pretty-printed RDF/XML string
 */
function buildBatchRdfXml(docs) {
  const root = create({ version: "1.0", encoding: "UTF-8" })
    .ele("rdf:RDF", rootAttributes());

  // Deduplicate Countries, Types, Years — collect unique values
  const seenCountries = new Map();  // iso → props
  const seenTypes = new Set();
  const seenYears = new Set();

  for (const doc of docs) {
    appendDisasterDescription(root, doc, null);

    if (hasValue(doc["ISO"])) {
      seenCountries.set(doc["ISO"], {
        iso: doc["ISO"],
        name: doc["Country"],
        region: doc["Region"],
        subregion: doc["Subregion"],
      });
    }
    if (hasValue(doc["Disaster Type"])) seenTypes.add(doc["Disaster Type"]);
    if (hasValue(doc["Start Year"])) seenYears.add(doc["Start Year"]);
  }

  // Append deduplicated reference nodes
  for (const [, props] of seenCountries) appendCountryDescription(root, props);
  for (const typeName of seenTypes) appendDisasterTypeDescription(root, typeName);
  for (const year of seenYears) appendYearDescription(root, year);

  return root.end({ prettyPrint: true });
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a generated RDF/XML string for structural correctness.
 *
 * Checks performed:
 *  1. Well-formed XML (xmlbuilder2 re-parse)
 *  2. Root element is rdf:RDF
 *  3. At least one rdf:Description element exists
 *  4. Every rdf:Description has an rdf:about attribute
 *
 * @param {string} xmlString - The RDF/XML string to validate
 * @returns {{ valid: boolean, checks: object, errors: string[] }}
 */
function validateRdfXml(xmlString) {
  const errors = [];
  const checks = {
    wellFormedXml: false,
    hasRdfRoot: false,
    hasDescriptions: false,
    allDescriptionsHaveAbout: false,
    tripleCount: 0,
    subjectUris: [],
  };

  try {
    // Re-parse the full document (throws if the XML is malformed)
    create(xmlString);
    checks.wellFormedXml = true;

    // Check root element tag
    checks.hasRdfRoot = xmlString.includes("<rdf:RDF");

    // Count rdf:Description elements
    const descMatches = xmlString.match(/<rdf:Description\b/g) || [];
    checks.hasDescriptions = descMatches.length > 0;

    // Check every description has rdf:about
    const aboutMatches = xmlString.match(/rdf:about=/g) || [];
    checks.allDescriptionsHaveAbout = aboutMatches.length === descMatches.length;

    // Extract subject URIs
    const uriPattern = /rdf:about="([^"]+)"/g;
    let match;
    while ((match = uriPattern.exec(xmlString)) !== null) {
      checks.subjectUris.push(match[1]);
    }

    // Rough triple count: count predicate elements (any ddt: or geo: element)
    const tripleMatches = xmlString.match(/<ddt:|<geo:/g) || [];
    checks.tripleCount = tripleMatches.length;
  } catch (err) {
    errors.push(`XML parse error: ${err.message}`);
    checks.wellFormedXml = false;
  }

  const valid =
    checks.wellFormedXml &&
    checks.hasRdfRoot &&
    checks.hasDescriptions &&
    checks.allDescriptionsHaveAbout;

  return { valid, checks, errors };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  extractDisasterCode,
  escapeXml,
  buildDisasterRdfXml,
  buildBatchRdfXml,
  validateRdfXml,
  NS,
  XSD,
};