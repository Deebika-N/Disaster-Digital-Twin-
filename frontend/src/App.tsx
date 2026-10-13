import React, { useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, type TabType } from './components/layout/Sidebar';
import { OverviewSection } from './components/overview/OverviewSection';
import { HistoricalAnalyticsSection } from './components/analytics/HistoricalAnalyticsSection';
import { DisasterRecordsSection } from './components/records/DisasterRecordsSection';
import { WeatherSection } from './components/weather/WeatherSection';
import { AlertsSection } from './components/alerts/AlertsSection';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleRefreshAll = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-midnight-950 text-slate-100 flex flex-col font-sans">
      {/* Top Operations Header */}
      <Navbar activeTab={activeTab} onRefreshAll={handleRefreshAll} />

      {/* Main Content Area with Sidebar Navigation */}
      <div className="flex-1 flex flex-col md:flex-row w-full">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Dynamic Section Container */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          <div key={refreshKey} className="transition-opacity duration-200">
            {activeTab === 'overview' && (
              <OverviewSection onNavigateToTab={setActiveTab} />
            )}
            {activeTab === 'analytics' && <HistoricalAnalyticsSection />}
            {activeTab === 'records' && <DisasterRecordsSection />}
            {activeTab === 'weather' && <WeatherSection />}
            {activeTab === 'alerts' && <AlertsSection />}
          </div>
        </main>
      </div>

      {/* Global Footer */}
      <footer className="border-t border-midnight-800 bg-midnight-900/90 px-6 py-3 text-[11px] text-slate-400 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400"></span>
          <span>Smart Disaster Digital Twin • Big Data Laboratory</span>
        </div>
        <div>
          <span>Powered by EM-DAT Emergency Events Database + Neo4j Graph Aura</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
