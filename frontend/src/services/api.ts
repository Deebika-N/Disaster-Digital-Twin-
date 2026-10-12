import axios from 'axios';
import type {
  DisastersResponse,
  DisasterRecord,
  DashboardAnalyticsData,
  TimelineDataPoint,
  TopCountryItem,
  TypeComparisonItem,
  HeatmapItem,
  GraphOverviewData,
  BackendHealth,
  MetadataTypes,
  MetadataRegions,
} from '../types/disaster';

// Get API base URL from Vite environment variable, fallback to /api/v1 (which proxies to backend)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// Server root for /health
const SERVER_ROOT = BASE_URL.replace(/\/api\/v1\/?$/, '');

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (
    value &&
    typeof value === 'object' &&
    'low' in value &&
    typeof value.low === 'number'
  ) {
    return value.low;
  }
  return undefined;
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Check backend server & database health
  async checkHealth(): Promise<BackendHealth> {
    try {
      const res = await axios.get<BackendHealth>(`${SERVER_ROOT}/health`, { timeout: 5000 });
      return res.data;
    } catch {
      // Also try via Vite proxy
      const res = await axios.get<BackendHealth>('/health', { timeout: 5000 });
      return res.data;
    }
  },

  // 1. Overview KPIs
  async getDashboardAnalytics(): Promise<DashboardAnalyticsData> {
    const res = await apiClient.get<{ success: boolean; data: DashboardAnalyticsData }>('/analytics/dashboard');
    return res.data.data;
  },

  // Disasters Stats
  async getDisasterStats(params?: Record<string, unknown>) {
    const res = await apiClient.get<{ success: boolean; data: Record<string, unknown> }>('/disasters/stats', { params });
    return res.data.data;
  },

  // Historical Timeline
  async getTimeline(params?: {
    type?: string;
    region?: string;
    iso?: string;
    startYear?: number;
    endYear?: number;
  }): Promise<TimelineDataPoint[]> {
    const res = await apiClient.get<{
      success: boolean;
      data: { timeline: TimelineDataPoint[] };
    }>('/analytics/timeline', { params });
    return res.data.data.timeline;
  },

  // Historical Disaster Type Comparison
  async getTypeComparison(types: string[]): Promise<TypeComparisonItem[]> {
    const res = await apiClient.get<{
      success: boolean;
      data: { comparison: TypeComparisonItem[] };
    }>('/analytics/type-comparison', {
      params: { types: types.join(',') },
    });
    return res.data.data.comparison;
  },

  // Top Most Affected Countries
  async getTopCountries(params?: { limit?: number; metric?: 'totalDeaths' | 'totalAffected' }): Promise<TopCountryItem[]> {
    const res = await apiClient.get<{
      success: boolean;
      data: {
        countries: Array<TopCountryItem & {
          country?: string;
          totalDeaths?: unknown;
          totalAffected?: unknown;
          eventCount?: unknown;
        }>;
      };
    }>('/analytics/top-countries', { params });
    return res.data.data.countries.map((country) => ({
      ...country,
      name: country.name || country.country || 'Unknown',
      totalDeaths: toNumber(country.totalDeaths),
      totalAffected: toNumber(country.totalAffected),
      eventCount: toNumber(country.eventCount),
    }));
  },

  // Choropleth / Heatmap Aggregation
  async getHeatmap(params?: { startYear?: number; endYear?: number; type?: string }): Promise<HeatmapItem[]> {
    const res = await apiClient.get<{
      success: boolean;
      data: { heatmap: HeatmapItem[] };
    }>('/analytics/heatmap', { params });
    return res.data.data.heatmap;
  },

  // Deadliest Disasters
  async getDeadliest(limit = 10): Promise<DisasterRecord[]> {
    const res = await apiClient.get<{
      success: boolean;
      data: {
        disasters: Array<{
          eventKey?: string;
          country?: string;
          type?: string;
          startYear?: unknown;
          totalDeaths?: unknown;
          totalAffected?: unknown;
        }>;
      };
    }>('/disasters/deadliest', { params: { limit } });
    return res.data.data.disasters.map((disaster) => ({
      _id: disaster.eventKey || `${disaster.country || 'unknown'}-${String(disaster.startYear || 'unknown')}`,
      Country: disaster.country || 'Unknown',
      'Disaster Type': disaster.type || 'Unknown',
      'Start Year': toNumber(disaster.startYear),
      'Total Deaths': toNumber(disaster.totalDeaths),
      'Total Affected': toNumber(disaster.totalAffected),
    }));
  },

  // Neo4j Graph Overview
  async getGraphOverview(): Promise<GraphOverviewData> {
    const res = await apiClient.get<{
      success: boolean;
      data: {
        nodes: Array<{ label: string; count: number }>;
        relationships: Array<{ type: string; count: number }>;
      };
    }>('/graph/overview');

    const nodeCounts = Object.fromEntries(
      res.data.data.nodes.map(({ label, count }) => [
        label === 'DisasterRecord' ? 'disasters' :
        label === 'Country' ? 'countries' :
        label === 'DisasterType' ? 'types' :
        label === 'Year' ? 'years' : label,
        count,
      ])
    ) as GraphOverviewData['nodeCounts'];

    const relationshipCounts = Object.fromEntries(
      res.data.data.relationships.map(({ type, count }) => [
        type === 'OCCURRED_IN' ? 'occurredIn' :
        type === 'HAS_TYPE' ? 'hasType' :
        type === 'IN_YEAR' ? 'inYear' :
        type === 'ASSOCIATED_WITH' ? 'associatedWith' : type,
        count,
      ])
    ) as GraphOverviewData['relationshipCounts'];

    return { nodeCounts, relationshipCounts };
  },

  // 6. Disaster Records Table (with pagination & filters)
  async getDisasters(params?: {
    page?: number;
    limit?: number;
    sort?: string;
    type?: string;
    country?: string;
    region?: string;
    startYear?: number;
    endYear?: number;
    minDeaths?: number;
    search?: string;
    appeal?: string;
    declaration?: string;
  }): Promise<DisastersResponse> {
    const res = await apiClient.get<{
      success: boolean;
      data: DisastersResponse;
    }>('/disasters', { params });
    return res.data.data;
  },

  // Single disaster detail with Neo4j graph enrichment
  async getDisasterById(id: string): Promise<{ disaster: DisasterRecord; graphData: unknown }> {
    const res = await apiClient.get<{
      success: boolean;
      data: { disaster: DisasterRecord; graphData: unknown };
    }>(`/disasters/${id}`);
    return res.data.data;
  },

  // Metadata: types & regions
  async getMetadataTypes(): Promise<MetadataTypes> {
    const res = await apiClient.get<{ success: boolean; data: MetadataTypes }>('/disasters/types');
    return res.data.data;
  },

  async getMetadataRegions(): Promise<MetadataRegions> {
    const res = await apiClient.get<{ success: boolean; data: MetadataRegions }>('/disasters/regions');
    return res.data.data;
  },
};
