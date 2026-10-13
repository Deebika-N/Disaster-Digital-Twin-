import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Skull,
  Building,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { apiService } from '../../services/api';
import type {
  TimelineDataPoint,
  TopCountryItem,
  DisasterRecord,
  MetadataTypes,
} from '../../types/disaster';
import { CardSkeleton } from '../common/LoadingSkeleton';
import { ErrorBanner } from '../common/ErrorBanner';
import { Badge, getDisasterTypeBadgeVariant } from '../common/Badge';

export const HistoricalAnalyticsSection: React.FC = () => {
  const [timeline, setTimeline] = useState<TimelineDataPoint[]>([]);
  const [topCountries, setTopCountries] = useState<TopCountryItem[]>([]);
  const [deadliest, setDeadliest] = useState<DisasterRecord[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  // Filters
  const [selectedType, setSelectedType] = useState<string>('');
  const [startYear, setStartYear] = useState<number>(1980);
  const [endYear, setEndYear] = useState<number>(2026);
  const [countryMetric, setCountryMetric] = useState<'totalDeaths' | 'totalAffected'>('totalDeaths');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const typesRes: MetadataTypes = await apiService.getMetadataTypes();
        if (typesRes?.types) {
          setAvailableTypes(typesRes.types.filter(Boolean));
        }
      } catch {
        setAvailableTypes(['Flood', 'Storm', 'Earthquake', 'Wildfire', 'Drought', 'Extreme temperature']);
      }
    };
    fetchMetadata();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [timelineRes, countriesRes, deadliestRes] = await Promise.allSettled([
        apiService.getTimeline({
          type: selectedType || undefined,
          startYear,
          endYear,
        }),
        apiService.getTopCountries({
          limit: 10,
          metric: countryMetric,
        }),
        apiService.getDeadliest(6),
      ]);

      if (timelineRes.status === 'fulfilled') {
        setTimeline(timelineRes.value || []);
      } else {
        throw new Error(timelineRes.reason?.message || 'Failed to fetch timeline data');
      }

      if (countriesRes.status === 'fulfilled') {
        setTopCountries(countriesRes.value || []);
      }

      if (deadliestRes.status === 'fulfilled') {
        setDeadliest(deadliestRes.value || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching historical analytics from backend';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedType, startYear, endYear, countryMetric]);

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Analytics Control Header */}
      <div className="bg-midnight-850/90 border border-midnight-750 rounded-xl p-4 shadow-glass">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-accent" />
              <span>Historical Analytics & Trend Engine</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Multi-decadal pattern analysis aggregated from the EM-DAT disaster database.
            </p>
          </div>

          {/* Interactive Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Disaster Type Filter */}
            <div className="flex items-center gap-1.5 bg-midnight-950 px-2.5 py-1.5 rounded-lg border border-midnight-750 text-xs">
              <span className="text-slate-400">Type:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer"
              >
                <option value="" className="bg-midnight-900 text-slate-200">All Disaster Types</option>
                {availableTypes.map((t: string) => (
                  <option key={t} value={t} className="bg-midnight-900 text-slate-200">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Year */}
            <div className="flex items-center gap-1.5 bg-midnight-950 px-2.5 py-1.5 rounded-lg border border-midnight-750 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">From:</span>
              <select
                value={startYear}
                onChange={(e) => setStartYear(parseInt(e.target.value))}
                className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer font-mono"
              >
                <option value={1960} className="bg-midnight-900">1960</option>
                <option value={1980} className="bg-midnight-900">1980</option>
                <option value={2000} className="bg-midnight-900">2000</option>
                <option value={2010} className="bg-midnight-900">2010</option>
                <option value={2020} className="bg-midnight-900">2020</option>
              </select>
            </div>

            {/* End Year */}
            <div className="flex items-center gap-1.5 bg-midnight-950 px-2.5 py-1.5 rounded-lg border border-midnight-750 text-xs">
              <span className="text-slate-400">To:</span>
              <select
                value={endYear}
                onChange={(e) => setEndYear(parseInt(e.target.value))}
                className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer font-mono"
              >
                <option value={2026} className="bg-midnight-900">2026 (Present)</option>
                <option value={2024} className="bg-midnight-900">2024</option>
                <option value={2020} className="bg-midnight-900">2020</option>
                <option value={2015} className="bg-midnight-900">2015</option>
                <option value={2000} className="bg-midnight-900">2000</option>
              </select>
            </div>

            <button
              onClick={loadAnalytics}
              disabled={loading}
              className="p-1.5 bg-midnight-800 hover:bg-midnight-750 text-slate-300 rounded-lg border border-midnight-700 transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-accent' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <ErrorBanner
          title="Failed to Load Historical Analytics"
          message={error}
          onRetry={loadAnalytics}
        />
      )}

      {loading ? (
        <div className="space-y-6">
          <CardSkeleton count={3} />
          <div className="h-80 bg-midnight-850 rounded-xl animate-pulse"></div>
        </div>
      ) : (
        <>
          {/* Main Historical Timeline Chart (Events & Fatalities Area Chart) */}
          <div className="bg-midnight-850/90 border border-midnight-750 rounded-xl p-5 shadow-glass">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-accent" />
                  <span>Annual Disaster Frequency & Fatality Trajectory ({startYear} - {endYear})</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Year-by-year aggregate metrics from <code className="text-teal-300">/api/v1/analytics/timeline</code>
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-teal-300">
                  <span className="w-3 h-0.5 bg-teal-400"></span> Incident Count
                </span>
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="w-3 h-0.5 bg-emergency-red"></span> Casualties (log scaled)
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timeline}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5C9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00E5C9" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="deathGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#13353E" opacity={0.5} />
                  <XAxis
                    dataKey="year"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    yAxisId="left"
                  />
                  <YAxis
                    stroke="#EF4444"
                    fontSize={11}
                    tickLine={false}
                    orientation="right"
                    yAxisId="right"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0E2930',
                      borderColor: '#18424D',
                      borderRadius: '8px',
                      color: '#F1F5F9',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="eventCount"
                    stroke="#00E5C9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#eventGradient)"
                    name="Incident Count"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalDeaths"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#deathGradient)"
                    name="Recorded Fatalities"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two Columns: Top Affected Countries & Deadliest Events Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Top Countries Bar Chart */}
            <div className="lg:col-span-7 bg-midnight-850/90 border border-midnight-750 rounded-xl p-5 shadow-glass">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Building className="w-4 h-4 text-teal-400" />
                    Top Affected Countries (Neo4j Graph Analysis)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Evaluated via Neo4j <code className="text-teal-300">getMostAffectedCountries</code>
                  </p>
                </div>

                {/* Metric toggle */}
                <div className="inline-flex p-0.5 rounded-lg bg-midnight-950 border border-midnight-750 text-xs">
                  <button
                    onClick={() => setCountryMetric('totalDeaths')}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                      countryMetric === 'totalDeaths'
                        ? 'bg-emergency-red/20 text-red-300 font-semibold border border-emergency-red/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    By Fatalities
                  </button>
                  <button
                    onClick={() => setCountryMetric('totalAffected')}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                      countryMetric === 'totalAffected'
                        ? 'bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    By Population
                  </button>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topCountries}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#13353E" opacity={0.4} />
                    <XAxis type="number" stroke="#94A3B8" fontSize={11} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#94A3B8"
                      fontSize={11}
                      width={80}
                      tick={{ fill: '#E2E8F0' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0E2930',
                        borderColor: '#18424D',
                        borderRadius: '8px',
                        color: '#F1F5F9',
                        fontSize: '12px',
                      }}
                      formatter={(val: unknown) => [formatNumber(typeof val === 'number' ? val : 0), countryMetric === 'totalDeaths' ? 'Deaths' : 'Affected']}
                    />
                    <Bar
                      dataKey={countryMetric}
                      fill={countryMetric === 'totalDeaths' ? '#EF4444' : '#00E5C9'}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Deadliest Events Spotlight */}
            <div className="lg:col-span-5 bg-midnight-850/90 border border-midnight-750 rounded-xl p-5 shadow-glass flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Skull className="w-4 h-4 text-emergency-red" />
                    Historic High-Mortality Records
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">Neo4j Deadliest</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Historical catastrophe records with highest verified human fatalities.
                </p>

                <div className="space-y-2.5">
                  {deadliest.slice(0, 5).map((d: DisasterRecord, index: number) => (
                    <div
                      key={d._id || index}
                      className="p-2.5 rounded-lg bg-midnight-900 border border-midnight-750/80 hover:border-teal-500/30 transition-all flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-midnight-800 text-teal-accent font-mono text-[10px] flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-100">{d.Country}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                            <span>{d['Start Year']}</span>
                            <span>•</span>
                            <Badge
                              label={d['Disaster Type']}
                              variant={getDisasterTypeBadgeVariant(d['Disaster Type'])}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-red-400">
                          {formatNumber(d['Total Deaths'])}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">Fatalities</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-midnight-750 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Total records analyzed:</span>
                <span className="text-teal-300 font-semibold">13,259 entries</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
