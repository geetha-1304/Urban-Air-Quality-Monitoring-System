// These mirror the JSON your backend actually returns
// ({ status, data }) and the MongoDB documents returned by the API.

export interface Station {
  id: number;
  name: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface Reading {
  id: number;
  station_id: number;
  aqi: number;
  pm2_5: number;
  pm10: number;
  no2: number;
  so2: number;
  recorded_at: string;
}

// Trend rows only contain the metric columns, no id/station_id
export interface TrendPoint {
  recorded_at: string;
  aqi: number;
  pm2_5: number;
  pm10: number;
  no2: number;
  so2: number;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export type AQICategoryLabel =
  | 'Good'
  | 'Moderate'
  | 'Unhealthy for Sensitive Groups'
  | 'Unhealthy'
  | 'Very Unhealthy'
  | 'Hazardous';

export interface AQICategory {
  label: AQICategoryLabel;
  colorVar: string;
}
