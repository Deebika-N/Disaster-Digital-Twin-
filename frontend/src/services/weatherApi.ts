import axios from 'axios';

export interface CurrentWeather {
  temperature: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  humidity?: number;
  pressure?: number;
  time: string;
}

export interface CityPreset {
  name: string;
  country: string;
  lat: number;
  lon: number;
  disasterRiskContext: string;
}

export const DISASTER_HOTSPOT_PRESETS: CityPreset[] = [
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, disasterRiskContext: 'High Seismic & Typhoon Zone' },
  { name: 'Manila', country: 'Philippines', lat: 14.5995, lon: 120.9842, disasterRiskContext: 'Tropical Cyclones & Volcano Risk' },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lon: 106.8456, disasterRiskContext: 'Coastal Inundation & Seismic Faults' },
  { name: 'Dhaka', country: 'Bangladesh', lat: 23.8103, lon: 90.4125, disasterRiskContext: 'Monsoon Flash Flooding & Storm Surges' },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lon: -118.2437, disasterRiskContext: 'Wildfire Hazard & San Andreas Fault' },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lon: 28.9784, disasterRiskContext: 'North Anatolian Fault Earthquake Hazard' },
  { name: 'Chennai', country: 'India', lat: 13.0827, lon: 80.2707, disasterRiskContext: 'Bay of Bengal Cyclones & Coastal Flooding' },
  { name: 'Port-au-Prince', country: 'Haiti', lat: 18.5944, lon: -72.3074, disasterRiskContext: 'Hurricanes & High Vulnerability Seismic' },
];

export async function fetchLiveWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&wind_speed_unit=kmh`;
  const res = await axios.get(url, { timeout: 8000 });
  const cur = res.data.current;

  return {
    temperature: cur.temperature_2m,
    windSpeed: cur.wind_speed_10m,
    windDirection: cur.wind_direction_10m,
    weatherCode: cur.weather_code,
    humidity: cur.relative_humidity_2m,
    pressure: cur.surface_pressure,
    time: cur.time,
  };
}

export function getWeatherCondition(code: number): { label: string; icon: string; severity: 'low' | 'moderate' | 'high' } {
  if (code === 0) return { label: 'Clear Sky', icon: '☀️', severity: 'low' };
  if (code <= 3) return { label: 'Partly Cloudy', icon: '⛅', severity: 'low' };
  if (code <= 48) return { label: 'Fog / Mist', icon: '🌫️', severity: 'low' };
  if (code <= 55) return { label: 'Drizzle', icon: '🌦️', severity: 'low' };
  if (code <= 65) return { label: 'Moderate Rain', icon: '🌧️', severity: 'moderate' };
  if (code <= 67) return { label: 'Freezing Rain', icon: '🌨️', severity: 'moderate' };
  if (code <= 77) return { label: 'Snowfall', icon: '❄️', severity: 'moderate' };
  if (code <= 82) return { label: 'Heavy Rain Showers', icon: '🌧️', severity: 'high' };
  if (code <= 86) return { label: 'Heavy Snow Showers', icon: '🌨️', severity: 'high' };
  if (code >= 95) return { label: 'Severe Thunderstorm', icon: '⛈️', severity: 'high' };
  return { label: 'Overcast', icon: '☁️', severity: 'low' };
}
