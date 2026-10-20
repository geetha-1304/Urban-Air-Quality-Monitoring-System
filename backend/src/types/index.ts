// These interfaces mirror the API document shapes. Keeping them in one place
// means every file agrees on what a "Station", "Reading", etc. looks like.

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
}

export interface Station {
  id: number;
  name: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  created_at: Date;
}

export interface Reading {
  id: number;
  station_id: number;
  aqi: number;
  pm2_5: number;
  pm10: number;
  no2: number;
  so2: number;
  recorded_at: Date;
}

export const POLLUTION_TYPES = [
  'Industrial Smoke', 'Vehicle Emissions', 'Burning Waste', 'Construction Dust',
  'Chemical Odour', 'Excessive Smoke', 'Other',
] as const;
export type PollutionType = typeof POLLUTION_TYPES[number];
export const REPORT_STATUSES = ['Pending', 'Under Review', 'Resolved', 'Rejected'] as const;
export type PollutionReportStatus = typeof REPORT_STATUSES[number];

export interface PollutionReport {
  id: number;
  user_id: number;
  title: string;
  pollution_type: PollutionType;
  location: string;
  mobile_number: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string;
  incident_at: Date;
  image_path: string | null;
  status: PollutionReportStatus;
  admin_remarks: string | null;
  status_admin_id: number | null;
  status_changed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Consistent API response shapes

export interface ApiSuccessResponse<T> {
  status: 'success';
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  status: 'error';
  message: string;
}

// Request body shapes

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface CreateStationRequest {
  name: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateReadingRequest {
  station_id: number;
  aqi: number;
  pm2_5: number;
  pm10: number;
  no2: number;
  so2: number;
  recorded_at?: string;
}
