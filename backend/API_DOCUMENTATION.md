# Disaster Digital Twin Backend API Documentation & Run Guide

This backend connects **MongoDB** (`smart_disaster_db` collection `disasters_normalized` with 13,259 records) and **Neo4j** (`DisasterRecord`, `Country`, `DisasterType`, `Year` graph nodes and relationships) to power the Disaster Digital Twin application.

---

## 1. How to Run the Backend

### Prerequisites
- Node.js (v18+) & npm installed.

### Setup & Run Commands

```bash
# Navigate to the backend directory
cd backend

# Install dependencies (already installed, run if needed)
npm install

# Start the server in development mode (with nodemon)
npm run dev

# Or start in standard production mode
npm start
```

The server runs by default on: **`http://localhost:5000`**

### Health Check
```bash
curl http://localhost:5000/health
```

---

## 2. API Endpoints Overview

All endpoints accept and return JSON. The base path for API routes is `/api/v1`.

| Module | Route Prefix | Primary Database |
| :--- | :--- | :--- |
| **Disasters** | `/api/v1/disasters` | MongoDB (`disasters_normalized`) |
| **Analytics** | `/api/v1/analytics` | MongoDB Aggregations & Neo4j |
| **Graph** | `/api/v1/graph` | Neo4j Aura Graph Engine |

---

## 3. Disasters API (`/api/v1/disasters`)

### 1. List / Filter Disasters
- **Method:** `GET`
- **URL:** `/api/v1/disasters`
- **Request Body:** None
- **Query Parameters:**
  - `page`: Page number (default: `1`)
  - `limit`: Records per page (default: `20`)
  - `sort`: Sort field, prefix with `-` for descending (e.g. `-Start Year`, `Total Deaths`)
  - `type`: Disaster type (e.g. `Earthquake`, `Flood`, `Storm`, `Wildfire`)
  - `subtype`: Subtype (e.g. `Ground movement`, `Flash flood`)
  - `group`: Disaster group (e.g. `Natural`, `Technological`)
  - `subgroup`: Disaster subgroup (e.g. `Geophysical`, `Hydrological`)
  - `country`: Country name (e.g. `India`, `Japan`)
  - `iso`: 3-letter ISO code (e.g. `IND`, `USA`, `KEN`)
  - `region`: Continent / World region (e.g. `Asia`, `Americas`, `Africa`, `Europe`)
  - `subregion`: e.g. `Southern Asia`, `Sub-Saharan Africa`
  - `startYear`: Start year filter (e.g. `2020`)
  - `endYear`: End year filter (e.g. `2026`)
  - `minDeaths`: Minimum total deaths (e.g. `100`)
  - `maxDeaths`: Maximum total deaths
  - `minAffected`: Minimum total people affected
  - `historic`: `true` or `false`
  - `appeal`: `true` or `false`
  - `declaration`: `true` or `false`
  - `search`: Full text search on Location / Country / Origin
  - `fields`: Comma-separated list of fields to return (e.g. `Country,Disaster Type,Total Deaths`)
- **Example Request:**
  ```bash
  curl "http://localhost:5000/api/v1/disasters?type=Earthquake&startYear=2020&limit=5"
  ```

---

### 2. Get Disaster Metadata Lists
- **Method:** `GET`
- **URL:** `/api/v1/disasters/types`
- **Description:** Returns all distinct groups, subgroups, types, and subtypes.
- **Request Body:** None

---

### 3. Get Available Regions & Countries
- **Method:** `GET`
- **URL:** `/api/v1/disasters/regions`
- **Description:** Returns list of distinct regions, subregions, and ISO-mapped countries.
- **Request Body:** None

---

### 4. Summary Statistics for Filtered Disasters
- **Method:** `GET`
- **URL:** `/api/v1/disasters/stats`
- **Description:** Aggregate statistics (by type, region, year, and totals) matching filters.
- **Request Body:** None
- **Query Parameters:** Accepts the same query filters as `GET /api/v1/disasters`.
- **Example Request:**
  ```bash
  curl "http://localhost:5000/api/v1/disasters/stats?region=Asia&startYear=2020"
  ```

---

### 5. Deadliest Disasters
- **Method:** `GET`
- **URL:** `/api/v1/disasters/deadliest`
- **Request Body:** None
- **Query Parameters:**
  - `limit`: Number of records (default: `10`)
- **Example Request:**
  ```bash
  curl "http://localhost:5000/api/v1/disasters/deadliest?limit=5"
  ```

---

### 6. Map Coordinates Data
- **Method:** `GET`
- **URL:** `/api/v1/disasters/map`
- **Description:** Returns lightweight array of disaster locations with `Latitude` and `Longitude` for map plotting.
- **Request Body:** None
- **Query Parameters:** Accepts filter options (e.g. `type`, `startYear`, `region`).

---

### 7. Get Single Disaster by ID
- **Method:** `GET`
- **URL:** `/api/v1/disasters/:id`
- **Description:** Returns the complete MongoDB document and enriches with connected Neo4j graph nodes.
- **Request Body:** None
- **Example Request:**
  ```bash
  curl "http://localhost:5000/api/v1/disasters/6aca3ae8fa2d6c2193c6b5cb"
  ```

---

## 4. Analytics API (`/api/v1/analytics`)

### 1. Dashboard Overview
- **Method:** `GET`
- **URL:** `/api/v1/analytics/dashboard`
- **Description:** High-level KPIs: total events, total deaths, total affected, top 10 disaster types, regional distribution, and timeline trend.
- **Request Body:** None

---

### 2. Timeline Aggregations
- **Method:** `GET`
- **URL:** `/api/v1/analytics/timeline`
- **Description:** Yearly aggregated events, death counts, and affected population.
- **Request Body:** None
- **Query Parameters:**
  - `type`: Filter by disaster type
  - `region`: Filter by region
  - `iso`: Filter by ISO country code
  - `startYear`: Minimum year
  - `endYear`: Maximum year

---

### 3. Country Disaster Profile
- **Method:** `GET`
- **URL:** `/api/v1/analytics/country/:iso`
- **Description:** Deep dive into a country's disaster history, yearly trends, and graph stats.
- **Request Body:** None
- **Example Request:**
  ```bash
  curl "http://localhost:5000/api/v1/analytics/country/IND"
  ```

---

### 4. Top Most Affected Countries
- **Method:** `GET`
- **URL:** `/api/v1/analytics/top-countries`
- **Request Body:** None
- **Query Parameters:**
  - `limit`: Number of countries (default: `10`)
  - `metric`: `totalDeaths` or `totalAffected` (default: `totalDeaths`)
- **Example Request:**
  ```bash
  curl "http://localhost:5000/api/v1/analytics/top-countries?limit=10&metric=totalDeaths"
  ```

---

### 5. Global Heatmap Data (Choropleth)
- **Method:** `GET`
- **URL:** `/api/v1/analytics/heatmap`
- **Description:** Summarized deaths, events, and affected counts grouped by ISO for choropleth mapping.
- **Request Body:** None
- **Query Parameters:** `type`, `startYear`, `endYear`

---

### 6. Disaster Type Comparison
- **Method:** `GET`
- **URL:** `/api/v1/analytics/type-comparison`
- **Description:** Compare the impact of multiple disaster types over time.
- **Request Body:** None
- **Query Parameters:**
  - `types`: Comma-separated types (required, e.g. `Flood,Earthquake,Storm`)
- **Example Request:**
  ```bash
  curl "http://localhost:5000/api/v1/analytics/type-comparison?types=Flood,Earthquake"
  ```

---

## 5. Neo4j Graph API (`/api/v1/graph`)

### 1. Graph Overview
- **Method:** `GET`
- **URL:** `/api/v1/graph/overview`
- **Description:** Returns node label counts (`DisasterRecord`, `Country`, `DisasterType`, `Year`) and relationship counts (`OCCURRED_IN`, `HAS_TYPE`, `IN_YEAR`, `ASSOCIATED_WITH`).
- **Request Body:** None

---

### 2. Get All Countries
- **Method:** `GET`
- **URL:** `/api/v1/graph/countries`
- **Description:** Returns all 150 `Country` graph nodes with properties (`name`, `iso`, `region`, `subregion`).
- **Request Body:** None

---

### 3. Get All Disaster Types
- **Method:** `GET`
- **URL:** `/api/v1/graph/types`
- **Description:** Returns all 57 `DisasterType` graph nodes along with event counts.
- **Request Body:** None

---

### 4. Get Related Disaster Types
- **Method:** `GET`
- **URL:** `/api/v1/graph/types/:name/related`
- **Description:** Finds co-occurring / associated disaster types via the `ASSOCIATED_WITH` relationship.
- **Request Body:** None
- **Example Request:**
  ```bash
  curl "http://localhost:5000/api/v1/graph/types/Flood/related"
  ```

---

### 5. Get Country Node with Stats
- **Method:** `GET`
- **URL:** `/api/v1/graph/country/:iso`
- **Request Body:** None
- **Example Request:**
  ```bash
  curl "http://localhost:5000/api/v1/graph/country/USA"
  ```

---

### 6. Get Country's Disasters
- **Method:** `GET`
- **URL:** `/api/v1/graph/country/:iso/disasters`
- **Request Body:** None
- **Query Parameters:**
  - `limit`: Number of records (default: `50`)

---

### 7. Get Disasters by Year
- **Method:** `GET`
- **URL:** `/api/v1/graph/year/:year`
- **Request Body:** None
- **Example Request:**
  ```bash
  curl "http://localhost:5000/api/v1/graph/year/2025"
  ```

---

### 8. Graph Timeline
- **Method:** `GET`
- **URL:** `/api/v1/graph/timeline`
- **Description:** All year nodes sorted chronologically with aggregate casualties.
- **Request Body:** None

---

### 9. Regional Disaster Type Breakdown
- **Method:** `GET`
- **URL:** `/api/v1/graph/region/:region/types`
- **Request Body:** None
- **Example Request:**
  ```bash
  curl "http://localhost:5000/api/v1/graph/region/Africa/types"
  ```

---

### 10. Execute Custom Read-Only Cypher Query
- **Method:** `POST`
- **URL:** `/api/v1/graph/query`
- **Headers:** `Content-Type: application/json`
- **Description:** Run custom read-only Cypher queries directly against the Neo4j Aura instance (destructive operations like `DELETE`, `CREATE`, `DROP` are blocked).
- **Request Body:**
  ```json
  {
    "query": "MATCH (d:DisasterRecord)-[:OCCURRED_IN]->(c:Country {iso: $iso}) RETURN d.origin AS origin, d.totalDeaths AS deaths, d.startYear AS year ORDER BY deaths DESC LIMIT $limit",
    "params": {
      "iso": "IND",
      "limit": 5
    }
  }
  ```
- **Example Request:**
  ```bash
  curl -X POST http://localhost:5000/api/v1/graph/query \
    -H "Content-Type: application/json" \
    -d '{
      "query": "MATCH (c:Country)<-[:OCCURRED_IN]-(d:DisasterRecord) RETURN c.name AS country, count(d) AS total ORDER BY total DESC LIMIT 5",
      "params": {}
    }'
  ```

