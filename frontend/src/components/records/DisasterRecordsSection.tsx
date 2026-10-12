import React, { useState, useEffect } from 'react';
import {
  TableProperties,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  X,
  FileText,
  Share2,
} from 'lucide-react';
import { apiService } from '../../services/api';
import type {
  DisasterRecord,
} from '../../types/disaster';
import { Badge, getDisasterTypeBadgeVariant } from '../common/Badge';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ErrorBanner } from '../common/ErrorBanner';
import { EmptyState } from '../common/EmptyState';

export const DisasterRecordsSection: React.FC = () => {
  const [records, setRecords] = useState<DisasterRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [sortField, setSortField] = useState<string>('-Start Year');

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [minDeaths, setMinDeaths] = useState<string>('');
  const [declarationOnly, setDeclarationOnly] = useState<boolean>(false);

  // Metadata dropdown options
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);

  // Selected Record Detail Modal state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<DisasterRecord | null>(null);
  const [detailGraphData, setDetailGraphData] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load dropdown filter metadata once
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [typesRes, regionsRes] = await Promise.allSettled([
          apiService.getMetadataTypes(),
          apiService.getMetadataRegions(),
        ]);
        if (typesRes.status === 'fulfilled' && typesRes.value?.types) {
          setTypeOptions(typesRes.value.types.filter(Boolean));
        }
        if (regionsRes.status === 'fulfilled' && regionsRes.value?.regions) {
          setRegionOptions(regionsRes.value.regions.filter(Boolean));
        }
      } catch {
        // graceful fallbacks
      }
    };
    fetchMetadata();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getDisasters({
        page: currentPage,
        limit: pageSize,
        sort: sortField,
        search: searchTerm || undefined,
        type: selectedType || undefined,
        region: selectedRegion || undefined,
        minDeaths: minDeaths ? parseInt(minDeaths) : undefined,
        declaration: declarationOnly ? 'true' : undefined,
      });

      setRecords(res.disasters || []);
      setTotalRecords(res.pagination?.total || 0);
      setTotalPages(res.pagination?.pages || 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query disaster records from backend';
      setError(msg);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [currentPage, pageSize, sortField, selectedType, selectedRegion, declarationOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadRecords();
  };

  // Inspect detail record via GET /api/v1/disasters/:id
  const handleInspect = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await apiService.getDisasterById(id);
      setDetailRecord(res.disaster);
      setDetailGraphData(res.graphData);
    } catch {
      // Fallback to row object in current records list
      const fallback = records.find((r: DisasterRecord) => r._id === id) || null;
      setDetailRecord(fallback);
      setDetailGraphData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetailRecord(null);
    setDetailGraphData(null);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-midnight-850/90 border border-midnight-750 rounded-xl p-4 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <TableProperties className="w-5 h-5 text-teal-accent" />
              <span>EM-DAT Disaster Directory</span>
              <span className="text-xs font-mono font-medium text-teal-300 bg-midnight-950 px-2 py-0.5 rounded border border-midnight-750">
                {totalRecords.toLocaleString()} Records
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Direct access to normalized disaster records in MongoDB with Neo4j graph cross-referencing.
            </p>
          </div>

          {/* Quick Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-midnight-950 border border-midnight-750 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer font-mono"
            >
              <option value="-Start Year">Most Recent Year</option>
              <option value="Start Year">Oldest Year</option>
              <option value="-Total Deaths">Highest Deaths</option>
              <option value="-Total Affected">Most People Affected</option>
            </select>

            <button
              onClick={loadRecords}
              disabled={loading}
              className="p-1.5 bg-midnight-800 hover:bg-midnight-750 text-slate-300 rounded-lg border border-midnight-700 transition-colors"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-accent' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-midnight-750/70">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] flex items-center gap-1.5 bg-midnight-950 px-2.5 py-1.5 rounded-lg border border-midnight-750">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search country, location, or origin..."
              className="w-full bg-transparent text-xs text-slate-100 outline-none placeholder:text-slate-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-midnight-950 px-2.5 py-1.5 rounded-lg border border-midnight-750 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer"
            >
              <option value="" className="bg-midnight-900">All Types</option>
              {typeOptions.map((t: string) => (
                <option key={t} value={t} className="bg-midnight-900">{t}</option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div className="flex items-center gap-1.5 bg-midnight-950 px-2.5 py-1.5 rounded-lg border border-midnight-750 text-xs">
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer"
            >
              <option value="" className="bg-midnight-900">All Regions</option>
              {regionOptions.map((r: string) => (
                <option key={r} value={r} className="bg-midnight-900">{r}</option>
              ))}
            </select>
          </div>

          {/* Declaration Filter Toggle */}
          <button
            onClick={() => {
              setDeclarationOnly(!declarationOnly);
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              declarationOnly
                ? 'bg-emergency-red/20 text-red-300 border-emergency-red/40'
                : 'bg-midnight-950 text-slate-400 border-midnight-750 hover:text-slate-200'
            }`}
          >
            <span>Emergency Declarations Only</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <ErrorBanner
          title="Records Query Failed"
          message={error}
          onRetry={loadRecords}
        />
      )}

      {/* Table Container */}
      {loading ? (
        <LoadingSkeleton rows={8} />
      ) : records.length === 0 ? (
        <EmptyState
          title="No Matching Disaster Records"
          description="None of the 13,259 records matched your search query or active filter settings."
          icon="database"
          actionText="Clear Filters"
          onAction={() => {
            setSearchTerm('');
            setSelectedType('');
            setSelectedRegion('');
            setMinDeaths('');
            setDeclarationOnly(false);
            setCurrentPage(1);
          }}
        />
      ) : (
        <div className="bg-midnight-850/90 border border-midnight-750 rounded-xl overflow-hidden shadow-glass">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-midnight-900/90 border-b border-midnight-750 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Event ID / DisNo</th>
                  <th className="py-3 px-4">Country & Region</th>
                  <th className="py-3 px-4">Disaster Type</th>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4 text-right">Fatalities</th>
                  <th className="py-3 px-4 text-right">Total Affected</th>
                  <th className="py-3 px-4 text-right">Damage (USD)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-midnight-750/60 font-sans">
                {records.map((r: DisasterRecord) => (
                  <tr
                    key={r._id}
                    className="hover:bg-midnight-800/60 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono text-teal-400 font-semibold whitespace-nowrap">
                      {r['DisNo.'] || r._id.substring(0, 10)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100">{r.Country}</div>
                      <div className="text-[11px] text-slate-400">
                        {r.Region || r.Subregion || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge
                        label={r['Disaster Type']}
                        variant={getDisasterTypeBadgeVariant(r['Disaster Type'])}
                      />
                      {r['Disaster Subtype'] && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                          {r['Disaster Subtype']}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {r['Start Year'] || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-red-300">
                      {(r['Total Deaths'] || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {(r['Total Affected'] || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-teal-300">
                      {r["Total Damage ('000 US$)"]
                        ? `$${((r["Total Damage ('000 US$)"] * 1000) / 1e6).toFixed(1)}M`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleInspect(r._id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-midnight-750 hover:bg-teal-500/20 text-slate-200 hover:text-teal-accent rounded-lg border border-midnight-650 hover:border-teal-500/30 transition-all font-medium text-[11px]"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Controls */}
          <div className="p-4 bg-midnight-900 border-t border-midnight-750 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="text-slate-400">
              Showing page <strong className="text-slate-200">{currentPage}</strong> of{' '}
              <strong className="text-slate-200">{totalPages}</strong> ({totalRecords.toLocaleString()} events)
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-midnight-950 border border-midnight-750 text-slate-200 rounded px-2 py-1 outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <button
                onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="px-3 py-1.5 rounded-lg bg-midnight-800 hover:bg-midnight-750 text-slate-200 disabled:opacity-40 disabled:pointer-events-none border border-midnight-700 flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <span className="px-2 text-teal-400 font-bold">{currentPage}</span>

              <button
                onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                className="px-3 py-1.5 rounded-lg bg-midnight-800 hover:bg-midnight-750 text-slate-200 disabled:opacity-40 disabled:pointer-events-none border border-midnight-700 flex items-center gap-1 transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Inspection Modal / Drawer */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-midnight-900 border border-midnight-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              onClick={closeDetail}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-100 bg-midnight-800 hover:bg-midnight-750 rounded-lg border border-midnight-700"
            >
              <X className="w-4 h-4" />
            </button>

            {detailLoading ? (
              <div className="py-12 text-center">
                <LoadingSkeleton rows={5} />
              </div>
            ) : detailRecord ? (
              <div className="space-y-5">
                {/* Header */}
                <div className="border-b border-midnight-750 pb-4 pr-8">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-teal-400 bg-midnight-950 px-2 py-0.5 rounded border border-midnight-800">
                      {detailRecord['DisNo.'] || detailRecord._id}
                    </span>
                    <Badge
                      label={detailRecord['Disaster Type']}
                      variant={getDisasterTypeBadgeVariant(detailRecord['Disaster Type'])}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100">{detailRecord.Country}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {detailRecord.Region} • {detailRecord.Subregion}
                  </p>
                </div>

                {/* Key Properties Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-midnight-850 p-3 rounded-lg border border-midnight-750">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Fatalities</div>
                    <div className="text-base font-bold font-mono text-red-300 mt-1">
                      {(detailRecord['Total Deaths'] || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-midnight-850 p-3 rounded-lg border border-midnight-750">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Total Affected</div>
                    <div className="text-base font-bold font-mono text-teal-300 mt-1">
                      {(detailRecord['Total Affected'] || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-midnight-850 p-3 rounded-lg border border-midnight-750">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Injured</div>
                    <div className="text-base font-bold font-mono text-amber-300 mt-1">
                      {(detailRecord['No. Injured'] || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-midnight-850 p-3 rounded-lg border border-midnight-750">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Reported Loss</div>
                    <div className="text-base font-bold font-mono text-blue-300 mt-1">
                      {detailRecord["Total Damage ('000 US$)"]
                        ? `$${detailRecord["Total Damage ('000 US$)"].toLocaleString()}k`
                        : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="bg-midnight-850/80 p-4 rounded-xl border border-midnight-750 space-y-2 text-xs">
                  <h4 className="font-semibold text-slate-200 flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5 text-teal-400" />
                    Classification & Geographic Markers
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-400">Subgroup:</span> {detailRecord['Disaster Subgroup'] || 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-400">Subtype:</span> {detailRecord['Disaster Subtype'] || 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-400">Location:</span> {detailRecord.Location || 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-400">Origin:</span> {detailRecord.Origin || 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-400">Declaration:</span> {detailRecord.Declaration || 'No'}
                    </div>
                    <div>
                      <span className="text-slate-400">Appeal:</span> {detailRecord.Appeal || 'No'}
                    </div>
                    {detailRecord.Latitude && detailRecord.Longitude && (
                      <div className="col-span-2 text-teal-300 font-mono">
                        Coordinates: {detailRecord.Latitude}°, {detailRecord.Longitude}°
                      </div>
                    )}
                  </div>
                </div>

                {/* Neo4j Graph Connection Box */}
                <div className="bg-gradient-to-r from-midnight-950 to-midnight-850 p-4 rounded-xl border border-teal-500/20 text-xs">
                  <div className="flex items-center gap-2 text-teal-accent font-semibold font-mono mb-1">
                    <Share2 className="w-3.5 h-3.5" />
                    Neo4j Aura Graph Link
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    {detailGraphData
                      ? 'Graph node linked with corresponding Country and Year vertices.'
                      : 'Dual-graph node cross-referenced via DisNo key.'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
