export const POLLUTION_TYPES = [
  'Industrial Smoke', 'Vehicle Emissions', 'Burning Waste', 'Construction Dust',
  'Chemical Odour', 'Excessive Smoke', 'Other',
] as const;
export type PollutionType = typeof POLLUTION_TYPES[number];
export const REPORT_STATUSES = ['Pending', 'Under Review', 'Resolved', 'Rejected'] as const;
export type PollutionReportStatus = typeof REPORT_STATUSES[number];

export interface ReportHistoryEntry {
  id: number;
  action: 'submitted' | 'status_changed' | 'remarks_updated';
  previous_status: PollutionReportStatus | null;
  new_status: PollutionReportStatus;
  remarks: string | null;
  admin_username: string | null;
  created_at: string;
}

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
  incident_at: string;
  status: PollutionReportStatus;
  admin_remarks: string | null;
  status_admin_id: number | null;
  status_changed_at: string | null;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  submitted_by?: string;
  submitter_email?: string;
  history?: ReportHistoryEntry[];
}

export interface PollutionReportList {
  reports: PollutionReport[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface PollutionReportStats {
  total: number;
  pending: number;
  under_review: number;
  resolved: number;
  rejected: number;
}
