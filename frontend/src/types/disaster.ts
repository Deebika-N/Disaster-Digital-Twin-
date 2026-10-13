// Disaster Record matching disasters_normalized schema
export interface DisasterRecord {
  _id: string;
  "DisNo."?: string;
  "DisNo"?: unknown;
  "Historic"?: string;
  "Classification Key"?: string;
  "Disaster Group"?: string;
  "Disaster Subgroup"?: string;
  "Disaster Type": string;
  "Disaster Subtype"?: string;
  "ISO"?: string;
  "Country": string;
  "Subregion"?: string;
  "Region"?: string;
  "Location"?: string;
  "Latitude"?: number;
  "Longitude"?: number;
  "Origin"?: string;
  "External IDs"?: string;
  "Magnitude"?: number;
  "Magnitude Scale"?: string;
  "Start Year"?: number;
  "Start Month"?: number;
  "Start Day"?: number;
  "End Year"?: number;
  "End Month"?: number;
  "End Day"?: number;
  "Entry Date"?: string;
  "Last Update"?: string;
  "OFDA/BHA Response"?: string;
  "Appeal"?: string;
  "Declaration"?: string;
  "Total Deaths"?: number;
  "No. Injured"?: number;
  "No. Affected"?: number;
  "Total Affected"?: number;
  "Total Damage ('000 US$)"?: number;
  "Total Damage, Adjusted ('000 US$)"?: number;
  "CPI"?: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DisastersResponse {
  disasters: DisasterRecord[];
  pagination: Pagination;
}

export interface MapDisasterPoint {
  _id: string;
  "DisNo."?: string;
  "Disaster Type": string;
  "Country": string;
  "ISO"?: string;
  "Latitude": number;
  "Longitude": number;
  "Start Year"?: number;
  "Total Deaths"?: number;
  "Total Affected"?: number;
}

export interface DashboardSummary {
  _id: null;
  totalEvents: number;
  totalDeaths: number;
  totalAffected: number;
  totalDamageK: number;
}

export interface TypeDistribution {
  _id: string;
  count: number;
  totalDeaths?: number;
}

export interface RegionDistribution {
  _id: string;
  count: number;
  totalDeaths?: number;
  totalAffected?: number;
}

export interface YearTrendItem {
  _id?: number;
  year?: number;
  count?: number;
  eventCount?: number;
  totalDeaths?: number;
  totalAffected?: number;
  totalDamageK?: number;
}

export interface DashboardAnalyticsData {
  summary: DashboardSummary;
  byType: TypeDistribution[];
  byRegion: RegionDistribution[];
  lastYear: {
    events?: number;
    deaths?: number;
    affected?: number;
  };
  yearTimeline: YearTrendItem[];
  generatedAt: string;
}

export interface TimelineDataPoint {
  year: number;
  eventCount: number;
  totalDeaths: number;
  totalAffected: number;
  totalDamageK: number;
}

export interface TopCountryItem {
  name: string;
  iso: string;
  totalDeaths?: number;
  totalAffected?: number;
  eventCount?: number;
}

export interface TypeComparisonItem {
  _id: {
    type: string;
    year: number;
  };
  count: number;
  totalDeaths: number;
  totalAffected: number;
}

export interface HeatmapItem {
  _id: string; // ISO
  country: string;
  region: string;
  eventCount: number;
  totalDeaths: number;
  totalAffected: number;
  totalDamageK: number;
}

export interface GraphOverviewData {
  nodeCounts: {
    disasters: number;
    countries: number;
    types: number;
    years: number;
  };
  relationshipCounts: {
    occurredIn: number;
    hasType: number;
    inYear: number;
    associatedWith: number;
  };
}

export interface BackendHealth {
  success: boolean;
  message: string;
  timestamp: string;
  environment?: string;
  databases?: {
    mongodb: string;
    neo4j: string;
  };
}

export interface MetadataTypes {
  groups: string[];
  subgroups: string[];
  types: string[];
  subtypes: string[];
}

export interface MetadataRegions {
  regions: string[];
  subregions: string[];
  countries: string[];
}
