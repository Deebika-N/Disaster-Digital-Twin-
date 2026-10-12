import React, { useEffect, useState } from 'react';
import {
  BellRing,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Filter,
  RefreshCw,
  Calendar,
  MapPin,
  FileCheck2,
} from 'lucide-react';
import { apiService } from '../../services/api';
import type { DisasterRecord } from '../../types/disaster';
import { Badge, getDisasterTypeBadgeVariant } from '../common/Badge';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ErrorBanner } from '../common/ErrorBanner';
import { EmptyState } from '../common/EmptyState';

type AlertLevel = 'all' | 'critical' | 'high' | 'moderate';

interface AlertItem {
  id: string;
  disaster: DisasterRecord;
  level: 'critical' | 'high' | 'moderate';
  ruleTrigger: string;
  timestamp: string;
}

export const AlertsSection: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [levelFilter, setLevelFilter] = useState<AlertLevel>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Query recent high-impact events with declarations or appeals from backend
      const res = await apiService.getDisasters({
        limit: 40,
        sort: '-Start Year',
        minDeaths: 50,
      });

      const records = res.disasters || [];

      // Derive deterministic alerts based on EM-DAT flags
      const derived: AlertItem[] = records.map((d) => {
        const deaths = d['Total Deaths'] || 0;
        const hasDeclaration = d.Declaration === 'Yes';
        const hasAppeal = d.Appeal === 'Yes';
        const affected = d['Total Affected'] || 0;

        let level: 'critical' | 'high' | 'moderate' = 'moderate';
        const reasons: string[] = [];

        if (hasDeclaration) {
          reasons.push('Official Emergency Declaration Issued');
          level = 'critical';
        }
        if (hasAppeal) {
          reasons.push('International Humanitarian Appeal Logged');
          level = 'critical';
        }
        if (deaths >= 500) {
          reasons.push(`Mass Mortality Incident (${deaths.toLocaleString()} fatalities)`);
          level = 'critical';
        } else if (deaths >= 100 || affected >= 50000) {
          reasons.push(`High Casualty / Demographic Impact (${deaths} deaths)`);
          if (level !== 'critical') level = 'high';
        } else {
          reasons.push(`Elevated Impact Incident (${deaths} casualties)`);
        }

        return {
          id: d._id || d['DisNo.'] || Math.random().toString(),
          disaster: d,
          level,
          ruleTrigger: reasons.join(' • '),
          timestamp: `${d['Start Year'] || 'Unknown'}-${String(d['Start Month'] || 1).padStart(2, '0')}`,
        };
      });

      setAlerts(derived);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query alerts data from backend';
      setError(msg);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const filteredAlerts = alerts.filter((a) => {
    if (levelFilter === 'all') return true;
    return a.level === levelFilter;
  });

  return (
    <div className="space-y-6">
      {/* Required Honest Status & Mode Banner */}
      <div className="bg-midnight-850 border border-teal-500/30 rounded-xl p-5 shadow-glass">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-accent border border-teal-500/30 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-teal-200 uppercase tracking-wide">
                Alert Engine: Rule-Based Historical Impact Classifier
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-midnight-950 text-teal-300 border border-teal-500/30">
                Rule-Engine Mode
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Real-time push notifications (WebSocket / Kafka stream) are awaiting backend deployment. To maintain rigorous data truth without inventing mock real-time events, the notifications below are <strong>deterministically derived from verified EM-DAT criteria</strong> in the MongoDB database (<code className="text-teal-300 font-mono">Declaration: Yes</code>, <code className="text-teal-300 font-mono">Appeal: Yes</code>, and casualty thresholds).
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-midnight-850/90 border border-midnight-750 rounded-xl p-4 shadow-glass flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-teal-accent" />
          <span className="text-sm font-semibold text-slate-100">Historical Alert Feed</span>
          <span className="text-xs font-mono text-slate-400 bg-midnight-950 px-2 py-0.5 rounded border border-midnight-750">
            {filteredAlerts.length} Classified Notifications
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-midnight-950 px-2 py-1 rounded-lg border border-midnight-750 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as AlertLevel)}
              className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer font-mono"
            >
              <option value="all" className="bg-midnight-900 text-slate-200">All Risk Levels</option>
              <option value="critical" className="bg-midnight-900 text-slate-200">Critical (Declaration / Appeal)</option>
              <option value="high" className="bg-midnight-900 text-slate-200">High (&gt;100 Deaths / &gt;50k Affected)</option>
              <option value="moderate" className="bg-midnight-900 text-slate-200">Moderate Severity</option>
            </select>
          </div>

          <button
            onClick={loadAlerts}
            disabled={loading}
            className="p-1.5 bg-midnight-800 hover:bg-midnight-750 text-slate-300 rounded-lg border border-midnight-700 transition-colors"
            title="Reload Alert Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-accent' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alert Feed List */}
      {error ? (
        <ErrorBanner
          title="Could Not Retrieve Alert Records"
          message={error}
          onRetry={loadAlerts}
        />
      ) : loading ? (
        <LoadingSkeleton rows={5} />
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          title="No Matching Alerts"
          description="No disaster records matched the chosen alert level filter."
          icon="alert"
          actionText="View All Levels"
          onAction={() => setLevelFilter('all')}
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((item) => {
            const isCritical = item.level === 'critical';
            const isHigh = item.level === 'high';
            const d = item.disaster;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all duration-150 hover:-translate-y-0.5 bg-midnight-850/90 shadow-glass flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isCritical
                    ? 'border-emergency-red/40 hover:border-emergency-red/60'
                    : isHigh
                    ? 'border-emergency-amber/30 hover:border-emergency-amber/50'
                    : 'border-midnight-750 hover:border-teal-500/30'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-lg border shrink-0 mt-0.5 ${
                      isCritical
                        ? 'bg-emergency-red/15 border-emergency-red/30 text-emergency-red'
                        : isHigh
                        ? 'bg-emergency-amber/15 border-emergency-amber/30 text-emergency-amber'
                        : 'bg-teal-500/15 border-teal-500/30 text-teal-accent'
                    }`}
                  >
                    {isCritical ? (
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    ) : (
                      <Flame className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">{d.Country}</span>
                      {d['DisNo.'] && (
                        <span className="text-[11px] font-mono text-teal-400 bg-midnight-950 px-1.5 py-0.5 rounded border border-midnight-750">
                          {d['DisNo.']}
                        </span>
                      )}
                      <Badge
                        label={d['Disaster Type']}
                        variant={getDisasterTypeBadgeVariant(d['Disaster Type'])}
                        size="sm"
                      />
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                          isCritical
                            ? 'bg-emergency-red/20 text-red-300 border-emergency-red/40'
                            : isHigh
                            ? 'bg-emergency-amber/20 text-amber-300 border-emergency-amber/40'
                            : 'bg-midnight-900 text-slate-300 border-midnight-750'
                        }`}
                      >
                        {item.level.toUpperCase()} PRIORITY
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>{item.ruleTrigger}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Incident Year: {d['Start Year'] || 'N/A'}
                      </span>
                      {d.Location && (
                        <span className="flex items-center gap-1 truncate max-w-xs">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {d.Location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right impact counters */}
                <div className="flex items-center gap-4 shrink-0 font-mono text-right w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-midnight-750">
                  <div>
                    <div className="text-sm font-bold text-red-300">
                      {(d['Total Deaths'] || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Deaths</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-teal-300">
                      {(d['Total Affected'] || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Affected</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
