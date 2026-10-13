import React, { useState, useEffect } from 'react';
import {
  Wind,
  Droplets,
  Gauge,
  Compass,
  AlertCircle,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import {
  fetchLiveWeather,
  getWeatherCondition,
  DISASTER_HOTSPOT_PRESETS,
  type CurrentWeather,
  type CityPreset,
} from '../../services/weatherApi';
import { Badge } from '../common/Badge';

export const WeatherSection: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<CityPreset>(DISASTER_HOTSPOT_PRESETS[0]);
  const [customLat, setCustomLat] = useState<string>(DISASTER_HOTSPOT_PRESETS[0].lat.toString());
  const [customLon, setCustomLon] = useState<string>(DISASTER_HOTSPOT_PRESETS[0].lon.toString());
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLiveWeather(lat, lon);
      setWeather(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve meteorological data';
      setError(msg);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather(selectedCity.lat, selectedCity.lon);
  }, [selectedCity]);

  const handleApplyCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(customLat);
    const lonNum = parseFloat(customLon);
    if (isNaN(latNum) || isNaN(lonNum)) {
      setError('Please provide valid decimal coordinates for Latitude and Longitude.');
      return;
    }
    loadWeather(latNum, lonNum);
  };

  const condition = weather ? getWeatherCondition(weather.weatherCode) : null;

  return (
    <div className="space-y-6">
      {/* Weather Station Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hotspot Presets & Custom Coordinate Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-midnight-850/90 border border-midnight-750 rounded-xl p-5 shadow-glass">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-teal-accent" />
              Disaster Prone Hotspots
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Select a global high-risk disaster coordinate to observe live atmospheric triggers:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DISASTER_HOTSPOT_PRESETS.map((preset) => {
                const isSelected = selectedCity.name === preset.name;
                return (
                  <button
                    key={preset.name}
                    onClick={() => {
                      setSelectedCity(preset);
                      setCustomLat(preset.lat.toString());
                      setCustomLon(preset.lon.toString());
                    }}
                    className={`p-2.5 rounded-lg text-left transition-all border text-xs ${
                      isSelected
                        ? 'bg-teal-500/20 text-teal-accent border-teal-500/40 shadow-glow-subtle font-semibold'
                        : 'bg-midnight-900 text-slate-300 border-midnight-750 hover:bg-midnight-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-100">{preset.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{preset.country}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {preset.disasterRiskContext}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Coordinates Input Form */}
            <form onSubmit={handleApplyCoordinates} className="mt-5 pt-4 border-t border-midnight-750">
              <span className="text-xs font-semibold text-slate-200 block mb-2">
                Custom Coordinate Lookup:
              </span>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] text-slate-400 block font-mono">LATITUDE</label>
                  <input
                    type="number"
                    step="any"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    placeholder="e.g. 28.6139"
                    className="w-full bg-midnight-950 border border-midnight-750 rounded px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-teal-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block font-mono">LONGITUDE</label>
                  <input
                    type="number"
                    step="any"
                    value={customLon}
                    onChange={(e) => setCustomLon(e.target.value)}
                    placeholder="e.g. 77.2090"
                    className="w-full bg-midnight-950 border border-midnight-750 rounded px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-teal-400 font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-midnight-750 hover:bg-midnight-700 text-teal-accent font-medium text-xs rounded-lg border border-teal-500/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Fetch Weather for Coordinates
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Meteorological Station Readings */}
        <div className="lg:col-span-7">
          <div className="bg-midnight-850/90 border border-midnight-750 rounded-xl p-6 shadow-glass h-full flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between border-b border-midnight-750 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-slate-100">{selectedCity.name}</span>
                    <span className="text-xs font-mono text-teal-400 bg-midnight-950 px-2 py-0.5 rounded border border-midnight-750">
                      {selectedCity.country}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    <span>Coordinates: {selectedCity.lat}°, {selectedCity.lon}°</span>
                  </p>
                </div>

                {condition && (
                  <Badge
                    label={`${condition.icon} ${condition.label}`}
                    variant={condition.severity === 'high' ? 'red' : condition.severity === 'moderate' ? 'amber' : 'teal'}
                    size="md"
                  />
                )}
              </div>

              {/* Status / Loading / Error */}
              {error ? (
                <div className="p-4 bg-midnight-900 border border-emergency-red/40 rounded-lg text-xs text-red-300 my-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-emergency-red" />
                  <span>{error}</span>
                </div>
              ) : loading ? (
                <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
                  Querying Open-Meteo satellite atmospheric model...
                </div>
              ) : weather ? (
                <div className="my-6 space-y-6">
                  {/* Temperature showcase */}
                  <div className="flex items-center justify-between bg-midnight-900/80 p-5 rounded-xl border border-midnight-750">
                    <div>
                      <div className="text-4xl font-extrabold font-mono text-slate-100">
                        {weather.temperature}°C
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Ambient Surface Temperature
                      </div>
                    </div>
                    <div className="text-5xl">{condition?.icon || '🌤️'}</div>
                  </div>

                  {/* Atmospheric Parameter Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-midnight-900/90 p-3 rounded-lg border border-midnight-750">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                        <Wind className="w-3.5 h-3.5 text-teal-400" />
                        <span>Wind Speed</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-slate-100">
                        {weather.windSpeed} <span className="text-xs font-normal text-slate-400">km/h</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {weather.windSpeed > 50 ? 'Hazardous Gusts' : 'Moderate'}
                      </div>
                    </div>

                    <div className="bg-midnight-900/90 p-3 rounded-lg border border-midnight-750">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Wind Dir.</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-slate-100">
                        {weather.windDirection}°
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Compass heading</div>
                    </div>

                    <div className="bg-midnight-900/90 p-3 rounded-lg border border-midnight-750">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                        <Droplets className="w-3.5 h-3.5 text-blue-400" />
                        <span>Humidity</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-slate-100">
                        {weather.humidity ?? 'N/A'}%
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Relative surface moisture</div>
                    </div>

                    <div className="bg-midnight-900/90 p-3 rounded-lg border border-midnight-750">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                        <Gauge className="w-3.5 h-3.5 text-purple-400" />
                        <span>Pressure</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-slate-100">
                        {weather.pressure ? Math.round(weather.pressure) : 'N/A'} <span className="text-xs font-normal text-slate-400">hPa</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {(weather.pressure || 1013) < 1000 ? 'Low Pressure (Storm Risk)' : 'Stable'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Station Footer Note */}
            <div className="pt-3 border-t border-midnight-750/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Timestamp: {weather?.time || 'Pending'}</span>
              <span className="text-teal-400">Station Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
