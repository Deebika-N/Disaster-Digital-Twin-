const mongoose = require("mongoose");

/**
 * Mongoose model for the `disasters_normalized` collection in smart_disaster_db.
 *
 * Schema mirrors the actual EM-DAT data fields discovered from the live database.
 * All fields are optional (except _id) since records vary in completeness.
 */
const disasterRecordSchema = new mongoose.Schema(
  {
    // ── Disaster Identifier ───────────────────────────────────────────────────
    "DisNo.":          { type: String, index: true },   // e.g. "2025-0750-AFG"
    "DisNo":           { type: mongoose.Schema.Types.Mixed }, // legacy nested object

    // ── Classification ────────────────────────────────────────────────────────
    "Historic":             { type: String },           // "Yes" | "No"
    "Classification Key":   { type: String },           // e.g. "nat-geo-ear-gro"
    "Disaster Group":       { type: String, index: true }, // "Natural" | "Technological"
    "Disaster Subgroup":    { type: String, index: true }, // "Geophysical", "Hydrological" …
    "Disaster Type":        { type: String, index: true }, // "Earthquake", "Flood" …
    "Disaster Subtype":     { type: String },           // "Ground movement", "Flood (General)" …

    // ── Location ──────────────────────────────────────────────────────────────
    "ISO":       { type: String, index: true },         // ISO 3-letter country code
    "Country":   { type: String, index: true },
    "Subregion": { type: String, index: true },
    "Region":    { type: String, index: true },
    "Location":  { type: String },                      // free-text locations
    "Latitude":  { type: Number },
    "Longitude": { type: Number },

    // ── Event Details ─────────────────────────────────────────────────────────
    "Origin":           { type: String },               // "Heavy rain", "Ground movement" …
    "External IDs":     { type: String },               // "GLIDE:EQ-2025-000153"
    "Magnitude":        { type: Number },
    "Magnitude Scale":  { type: String },               // "Km2", "Moment Magnitude" …

    // ── Timeline ──────────────────────────────────────────────────────────────
    "Start Year":   { type: Number, index: true },
    "Start Month":  { type: Number },
    "Start Day":    { type: Number },
    "End Year":     { type: Number },
    "End Month":    { type: Number },
    "End Day":      { type: Number },
    "Entry Date":   { type: Date },
    "Last Update":  { type: Date },

    // ── Response Flags ────────────────────────────────────────────────────────
    "OFDA/BHA Response": { type: String },              // "Yes" | "No"
    "Appeal":            { type: String },              // "Yes" | "No"
    "Declaration":       { type: String },              // "Yes" | "No"

    // ── Impact Metrics ────────────────────────────────────────────────────────
    "Total Deaths":                         { type: Number },
    "No. Injured":                          { type: Number },
    "No. Affected":                         { type: Number },
    "No":                                   { type: mongoose.Schema.Types.Mixed }, // legacy nested
    "Total Affected":                       { type: Number, index: true },
    "Total Damage ('000 US$)":              { type: Number },
    "Total Damage, Adjusted ('000 US$)":    { type: Number },
    "CPI":                                  { type: Number },
  },
  {
    // Use the existing collection — don't create a new one
    collection: "disasters_normalized",
    // Don't add createdAt/updatedAt — these are imported records
    timestamps: false,
    // Allow extra fields not captured in the schema
    strict: false,
  }
);

// Compound indexes for common query patterns
disasterRecordSchema.index({ "Disaster Type": 1, "Start Year": -1 });
disasterRecordSchema.index({ "ISO": 1, "Start Year": -1 });
disasterRecordSchema.index({ "Region": 1, "Disaster Type": 1 });
disasterRecordSchema.index({ "Latitude": 1, "Longitude": 1 });

module.exports = mongoose.model("DisasterRecord", disasterRecordSchema);

