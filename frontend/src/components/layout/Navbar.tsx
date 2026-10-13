import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, ShieldAlert, RefreshCw, Cpu, Database } from 'lucide-react';
import { apiService } from '../../services/api';
import type { BackendHealth } from '../../types/disaster';

interface NavbarProps {
  activeTab: string;
  onRefreshAll?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onRefreshAll }) => {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [checking, setChecking] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  const checkServerHealth = async () => {
    setChecking(true);
    try {
      const data = await apiService.checkHealth();
      setHealth(data);
      setError(!data.success);
    } catch {
      setError(true);
      setHealth(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkServerHealth();
    const interval = setInterval(checkServerHealth, 30000); // 30s health check
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-midnight-900/90 backdrop-blur-md border-b border-midnight-750 px-4 lg:px-6 py-3 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Brand & Digital Twin identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-midnight-800 p-0.5 shadow-glow-teal flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-midnight-900 rounded-[10px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-teal-accent animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight leading-none">
                SMART DISASTER DIGITAL TWIN
              </h1>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-teal-500/15 text-teal-accent border border-teal-500/30">
                v2.0 DUAL-GRAPH
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
              <span>Big Data Operations Center</span>
              <span className="text-midnight-600">•</span>
              <span className="hidden md:inline text-teal-400/90 font-mono">EM-DAT (13,259 events) + Neo4j Aura</span>
            </p>
          </div>
        </div>

        {/* Status indicators and system clock */}
        <div className="flex items-center gap-3">
          {/* Backend Status Indicator */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-midnight-850 border border-midnight-700/80 text-xs font-mono"
            title={
              health
                ? `Backend: ${health.message}\nMongoDB: ${health.databases?.mongodb}\nNeo4j: ${health.databases?.neo4j}`
                : 'Backend unreachable on localhost:5000'
            }
          >
            {checking ? (
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
            ) : !error && health?.success ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-accent"></span>
                </span>
                <span className="text-teal-300 font-medium hidden sm:inline">BACKEND ONLINE</span>
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400 hidden sm:inline" />
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-emergency-red"></span>
                <span className="text-red-400 font-medium hidden sm:inline">BACKEND OFFLINE</span>
                <ShieldAlert className="w-3.5 h-3.5 text-red-400 hidden sm:inline" />
              </>
            )}
          </div>

          {/* Database stats pill */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-midnight-850/60 border border-midnight-750 text-[11px] text-slate-400 font-mono">
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span>MongoDB + Neo4j</span>
          </div>

          {/* Clock */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-midnight-850/60 border border-midnight-750 text-xs text-slate-300 font-mono">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime || '00:00:00'}</span>
          </div>

          {/* Refresh Action */}
          {onRefreshAll && (
            <button
              onClick={onRefreshAll}
              className="p-2 rounded-lg bg-midnight-850 hover:bg-midnight-800 text-slate-300 hover:text-teal-accent border border-midnight-700 transition-colors"
              title="Refresh all views"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
