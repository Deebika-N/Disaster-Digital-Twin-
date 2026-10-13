import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  CloudSun,
  BellRing,
  TableProperties,
} from 'lucide-react';

export type TabType = 'overview' | 'analytics' | 'weather' | 'alerts' | 'records';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'analytics',
      label: 'Historical Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      badge: 'EM-DAT',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      id: 'records',
      label: 'Disaster Records',
      icon: <TableProperties className="w-5 h-5" />,
      badge: '13.2k',
      badgeColor: 'text-slate-400 bg-slate-800 border-slate-700',
    },
    {
      id: 'weather',
      label: 'Weather Monitoring',
      icon: <CloudSun className="w-5 h-5" />,
      badge: 'Open-Meteo',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'alerts',
      label: 'Alerts & Notifications',
      icon: <BellRing className="w-5 h-5" />,
      badge: 'Rule-Based',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-midnight-900 border-b md:border-b-0 md:border-r border-midnight-750 flex md:flex-col justify-between shrink-0 p-3 md:p-4">
      <div className="w-full">
        <div className="hidden md:block mb-4 px-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Control Navigation
          </p>
        </div>

        {/* Navigation list */}
        <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 w-full">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left whitespace-nowrap md:whitespace-normal shrink-0 md:shrink w-auto md:w-full ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/20 to-midnight-800 text-teal-accent border border-teal-500/40 shadow-glow-subtle font-semibold'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-midnight-850/80 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${isActive ? 'text-teal-accent' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`hidden lg:inline-flex text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      item.badgeColor || 'text-slate-400 bg-midnight-800 border-midnight-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer system status note */}
      <div className="hidden md:block mt-6 pt-4 border-t border-midnight-750/80 px-2">
        <div className="bg-midnight-950/60 rounded-lg p-3 border border-midnight-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Primary Engine</span>
            <span className="text-teal-400 font-semibold">MongoDB</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1">
            <span>Graph Layer</span>
            <span className="text-cyan-400 font-semibold">Neo4j Aura</span>
          </div>
          <div className="mt-2 pt-2 border-t border-midnight-850 text-[10px] text-slate-400 leading-tight">
            EM-DAT Disasters (1900 - 2026)
          </div>
        </div>
      </div>
    </aside>
  );
};
