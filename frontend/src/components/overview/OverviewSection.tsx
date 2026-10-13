import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Users,
  DollarSign,
  Layers,
  Flame,
  Globe2,
  TrendingUp,
  Share2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { apiService } from '../../services/api';
import type { DashboardAnalyticsData, GraphOverviewData } from '../../types/disaster';
import { StatCard } from '../common/StatCard';
import { CardSkeleton } from '../common/LoadingSkeleton';
import { ErrorBanner } from '../common/ErrorBanner';

// Midnight Green & Teal Chart Palette
const COLORS = ['#00E5C9', '#14B8A6', '#0D9488', '#065F46', '#2DD4BF', '#38BDF8', '#818CF8', '#F59E0B'];

interface OverviewSectionProps {
  onNavigateToTab: (tab: 'overview' | 'analytics' | 'weather' | 'alerts' | 'records') => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ onNavigateToTab }) => {
  const [data, setData] = useState<DashboardAnalyticsData | null>(null);
  const [graphData, setGraphData] = useState<GraphOverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, graphRes] = await Promise.allSettled([
        apiService.getDashboardAnalytics(),
        apiService.getGraphOverview(),
      ]);

      if (dashRes.status === 'fulfilled') {
        setData(dashRes.value);
      } else {
        throw new Error(dashRes.reason?.message || 'Failed to fetch dashboard data from backend');
      }

      if (graphRes.status === 'fulfilled') {
        setGraphData(graphRes.value);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Backend connection error';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrencyK = (num?: number) => {
    if (!num) return '$0';
    // Damage is in ('000 US$)
    const billion = num / 1_000_000;
    if (billion >= 1) return `$${billion.toFixed(2)}B`;
    const million = num / 1_000;
    return `$${million.toFixed(1)}M`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-midnight-850 rounded-xl animate-pulse"></div>
          <div className="h-72 bg-midnight-850 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <ErrorBanner
          title="Could not connect to Digital Twin Analytics"
          message={error || 'Unable to retrieve dashboard metrics from http://localhost:5000/api/v1/analytics/dashboard'}
          onRetry={loadDashboard}
        />
        <div className="p-6 bg-midnight-850/60 rounded-xl border border-midnight-750 text-slate-300 text-sm">
          <h4 className="font-semibold text-teal-300 mb-2">Backend Connection Instructions</h4>
          <p className="text-xs text-slate-400 mb-3">
            Please verify that your backend server is running on port 5000:
          </p>
          <pre className="bg-midnight-950 p-3 rounded-lg font-mono text-xs text-teal-400 overflow-x-auto border border-midnight-800">
            cd backend&#10;npm install&#10;npm run dev
          </pre>
        </div>
      </div>
    );
  }

  const { summary, byType, byRegion, lastYear } = data;

  const typeChartData = byType.slice(0, 7).map((item) => ({
    name: item._id,
    events: item.count,
    deaths: item.totalDeaths || 0,
  }));

  const regionChartData = byRegion.map((item) => ({
    name: item._id || 'Unknown',
    value: item.count,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-midnight-750">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Disaster Intelligence Overview</span>
            <span className="text-xs font-mono font-normal text-teal-400 bg-midnight-800 px-2 py-0.5 rounded border border-midnight-700">
              MongoDB + Neo4j Synced
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Global emergency events, casualty totals, and geographical distribution across EM-DAT database.
          </p>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Disaster Events"
          value={formatNumber(summary.totalEvents)}
          subtitle="Validated EM-DAT disaster records"
          icon={<Layers className="w-5 h-5" />}
          accentColor="teal"
          trend="13,259 cataloged"
          trendType="positive"
        />
        <StatCard
          title="Recorded Fatalities"
          value={formatNumber(summary.totalDeaths)}
          subtitle="Cumulative direct & indirect deaths"
          icon={<AlertTriangle className="w-5 h-5" />}
          accentColor="red"
          trend="Human toll"
          trendType="negative"
        />
        <StatCard
          title="Total Population Affected"
          value={formatNumber(summary.totalAffected)}
          subtitle="Displaced, injured, or homeless"
          icon={<Users className="w-5 h-5" />}
          accentColor="amber"
          trend="Displaced & impacted"
          trendType="neutral"
        />
        <StatCard
          title="Estimated Economic Loss"
          value={formatCurrencyK(summary.totalDamageK)}
          subtitle="Raw reported damage in USD"
          icon={<DollarSign className="w-5 h-5" />}
          accentColor="blue"
          trend="Reported financial impact"
          trendType="neutral"
        />
      </div>

      {/* Neo4j Dual-Graph Layer Status Banner */}
      {graphData && (
        <div className="bg-gradient-to-r from-midnight-900 via-midnight-850 to-midnight-900 border border-teal-500/20 rounded-xl p-4 shadow-glass">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-accent">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300 font-mono">
                  Neo4j Aura Knowledge Graph
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Knowledge graph nodes interconnected via <code className="text-teal-300 font-mono">OCCURRED_IN</code> and <code className="text-teal-300 font-mono">HAS_TYPE</code> relationships.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto text-xs font-mono">
              <div className="bg-midnight-950/80 px-3 py-1.5 rounded-lg border border-midnight-750">
                <div className="text-slate-400 text-[10px]">Countries</div>
                <div className="text-teal-300 font-bold">{graphData.nodeCounts.countries}</div>
              </div>
              <div className="bg-midnight-950/80 px-3 py-1.5 rounded-lg border border-midnight-750">
                <div className="text-slate-400 text-[10px]">Disaster Types</div>
                <div className="text-teal-300 font-bold">{graphData.nodeCounts.types}</div>
              </div>
              <div className="bg-midnight-950/80 px-3 py-1.5 rounded-lg border border-midnight-750">
                <div className="text-slate-400 text-[10px]">Timeline Years</div>
                <div className="text-teal-300 font-bold">{graphData.nodeCounts.years}</div>
              </div>
              <div className="bg-midnight-950/80 px-3 py-1.5 rounded-lg border border-midnight-750">
                <div className="text-slate-400 text-[10px]">Graph Edges</div>
                <div className="text-teal-300 font-bold">
                  {formatNumber(
                    (graphData.relationshipCounts.occurredIn || 0) +
                    (graphData.relationshipCounts.hasType || 0) +
                    (graphData.relationshipCounts.inYear || 0)
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two-Column Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 7 Disaster Types Bar Chart */}
        <div className="lg:col-span-7 bg-midnight-850/90 border border-midnight-750 rounded-xl p-5 shadow-glass">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-emergency-amber" />
                Top Disaster Types by Total Recorded Events
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Frequency count across all years</p>
            </div>
            <button
              onClick={() => onNavigateToTab('analytics')}
              className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
            >
              Detailed Analytics &rarr;
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E2930',
                    borderColor: '#18424D',
                    borderRadius: '8px',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#00E5C9' }}
                />
                <Bar dataKey="events" fill="#00E5C9" radius={[4, 4, 0, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Regional Distribution Donut Chart */}
        <div className="lg:col-span-5 bg-midnight-850/90 border border-midnight-750 rounded-xl p-5 shadow-glass flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-teal-400" />
                Regional Distribution
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Continents</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">Event proportion by continental region</p>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {regionChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0E2930',
                      borderColor: '#18424D',
                      borderRadius: '8px',
                      color: '#F1F5F9',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-midnight-750">
            {regionChartData.map((r, i) => (
              <div key={r.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                ></span>
                <span className="text-slate-300 truncate">{r.name}:</span>
                <span className="font-mono text-teal-300 font-semibold">{formatNumber(r.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Year Operational Summary Box */}
      {lastYear && lastYear.events ? (
        <div className="bg-midnight-850/70 border border-midnight-700/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-accent border border-teal-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">
                Previous Year Activity Benchmark
              </h4>
              <p className="text-xs text-slate-400">
                Recorded {formatNumber(lastYear.events)} major events, resulting in {formatNumber(lastYear.deaths)} fatalities and {formatNumber(lastYear.affected)} people affected.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('records')}
            className="px-3 py-1.5 bg-midnight-750 hover:bg-midnight-700 text-slate-200 text-xs font-medium rounded-lg border border-midnight-600 transition-colors shrink-0"
          >
            View Incident Log
          </button>
        </div>
      ) : null}
    </div>
  );
};
