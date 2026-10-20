import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { AuthRequest } from '../middleware/authMiddleware';
import { asyncHandler, AppError } from '../middleware/errorMiddleware';
import { POLLUTION_TYPES, PollutionReportStatus, REPORT_STATUSES } from '../types';
import * as Reports from '../models/pollutionReportModel';
import * as Notifications from '../models/notificationModel';
import * as Users from '../models/userModel';

const imageDirectory = () => process.env.REPORT_UPLOAD_DIR || path.resolve(process.cwd(), 'uploads', 'reports');
const fileInfo = (buffer: Buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { extension: '.jpg', type: 'image/jpeg' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { extension: '.png', type: 'image/png' };
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { extension: '.webp', type: 'image/webp' };
  return null;
};

const safeReport = (report: any, includeSubmitterEmail = false) => {
  if (!report) return report;
  const { image_path: imagePath, submitter_email: submitterEmail, ...safe } = report;
  return {
    ...safe,
    ...(includeSubmitterEmail && submitterEmail ? { submitter_email: submitterEmail } : {}),
    image_url: imagePath ? `/reports/${report.id}/image` : null,
  };
};
const positiveId = (raw: string) => {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError('Invalid report ID', 400);
  return id;
};
const textValue = (raw: unknown, label: string, max: number) => {
  if (typeof raw !== 'string') throw new AppError(`${label} is required`, 400);
  const value = raw.trim();
  if (!value || value.length > max) throw new AppError(`${label} must be between 1 and ${max} characters`, 400);
  return value;
};
const normalizePage = (raw: unknown, fallback: number, max: number) => {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new AppError('Invalid pagination value', 400);
  return Math.min(value, max);
};
const mobilePattern = /^[6-9]\d{9}$/;
const optionalCoordinate = (raw: unknown, name: 'latitude' | 'longitude') => {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string' && typeof raw !== 'number') throw new AppError(`Invalid ${name}`, 400);
  const value = Number(raw);
  const [min, max] = name === 'latitude' ? [-90, 90] : [-180, 180];
  if (!Number.isFinite(value) || value < min || value > max) throw new AppError(`Invalid ${name}`, 400);
  return value;
};

export const createPollutionReport = asyncHandler(async (req, res) => {
  const authReq = req as AuthRequest;
  for (const key of ['user_id', 'status', 'admin_remarks', 'status_admin_id']) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) throw new AppError(`Do not submit ${key}; it is assigned by the server`, 400);
  }
  const title = textValue(req.body.title, 'Report title', 120);
  const pollutionType = textValue(req.body.pollution_type, 'Pollution type', 40);
  if (!(POLLUTION_TYPES as readonly string[]).includes(pollutionType)) throw new AppError('Select a valid pollution type', 400);
  const location = textValue(req.body.location, 'Location', 200);
  const mobileNumber = textValue(req.body.mobile_number, 'Mobile number', 10);
  if (!mobilePattern.test(mobileNumber)) throw new AppError('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.', 400);
  const latitude = optionalCoordinate(req.body.latitude, 'latitude');
  const longitude = optionalCoordinate(req.body.longitude, 'longitude');
  if ((latitude === null) !== (longitude === null)) throw new AppError('Latitude and longitude must be provided together', 400);
  const description = textValue(req.body.description, 'Description', 2000);
  if (description.length < 20) throw new AppError('Description must be at least 20 characters', 400);
  const incidentDate = new Date(req.body.incident_at);
  if (typeof req.body.incident_at !== 'string' || !Number.isFinite(incidentDate.getTime())) throw new AppError('Enter a valid incident date and time', 400);
  if (incidentDate.getTime() > Date.now()) throw new AppError('Incident date and time cannot be in the future', 400);

  let imagePath: string | null = null;
  if ((req as any).file) {
    const file = (req as any).file as { buffer: Buffer };
    const detected = fileInfo(file.buffer);
    if (!detected) throw new AppError('Image must be a valid JPEG, PNG, or WebP file', 400);
    await mkdir(imageDirectory(), { recursive: true });
    imagePath = `${randomUUID()}${detected.extension}`;
    await writeFile(path.join(imageDirectory(), imagePath), file.buffer, { flag: 'wx', mode: 0o600 });
  }
  try {
    const report = await Reports.createReport({ userId: authReq.user!.id, title, pollutionType, location, mobileNumber, latitude, longitude, description, incidentAt: incidentDate.toISOString(), imagePath });
    const adminIds = await Users.getAdminIds();
    await Promise.all(adminIds.map((adminId) => Notifications.createNotification({
      userId: adminId,
      type: 'report_submitted',
      title: 'New pollution report',
      message: `${authReq.user!.username} submitted “${report.title}”.`,
      link: '#pollution-reports',
    }))).catch((error) => console.warn('Could not create report notifications:', error));
    res.status(201).json({ status: 'success', data: safeReport(report), message: 'Pollution report submitted for review' });
  } catch (error) {
    if (imagePath) await unlink(path.join(imageDirectory(), imagePath)).catch(() => undefined);
    throw error;
  }
});

// GET /api/reports/reverse-geocode?latitude=&longitude=
// Proxies the configurable reverse-geocoder so browser location lookup works
// without exposing a provider key or relying on third-party CORS settings.
export const reverseGeocode = asyncHandler(async (req, res) => {
  const latitude = optionalCoordinate(req.query.latitude, 'latitude');
  const longitude = optionalCoordinate(req.query.longitude, 'longitude');
  if (latitude === null || longitude === null) throw new AppError('Latitude and longitude are required', 400);
  const endpoint = process.env.REVERSE_GEOCODING_URL || 'https://nominatim.openstreetmap.org/reverse';
  let url: URL;
  try { url = new URL(endpoint); }
  catch { throw new AppError('Reverse-geocoding service is not configured correctly', 500); }
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  let response: globalThis.Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'AirWatch/1.0' }, signal: AbortSignal.timeout(10_000) });
  } catch { throw new AppError('Could not reach the location service. Enter the incident location manually.', 502); }
  if (!response.ok) throw new AppError('Could not resolve this location. Enter the incident location manually.', 502);
  const payload = await response.json() as { display_name?: unknown; address?: Record<string, unknown> };
  const parts = payload.address ? [
    payload.address.road, payload.address.neighbourhood, payload.address.suburb,
    payload.address.city ?? payload.address.town ?? payload.address.village,
    payload.address.state,
  ].filter((part): part is string => typeof part === 'string' && Boolean(part.trim())) : [];
  const address = (Array.from(new Set(parts)).join(', ') || (typeof payload.display_name === 'string' ? payload.display_name : '')).slice(0, 200);
  if (!address) throw new AppError('Could not resolve this location. Enter the incident location manually.', 502);
  res.json({ status: 'success', data: { address, latitude, longitude } });
});

const listForUser = (ownerId: number) => asyncHandler(async (req, res) => {
  const page = normalizePage(req.query.page, 1, 1_000_000);
  const pageSize = normalizePage(req.query.pageSize, 10, 50);
  const status = req.query.status ? String(req.query.status) : undefined;
  const pollutionType = req.query.pollutionType ? String(req.query.pollutionType) : undefined;
  if (status && !(REPORT_STATUSES as readonly string[]).includes(status)) throw new AppError('Invalid report status filter', 400);
  if (pollutionType && !(POLLUTION_TYPES as readonly string[]).includes(pollutionType)) throw new AppError('Invalid pollution type filter', 400);
  const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';
  const result = await Reports.listReports({
    page, pageSize, sort, status, pollutionType,
    search: req.query.search ? String(req.query.search).slice(0, 120) : undefined,
  }, ownerId);
  res.json({ status: 'success', data: { reports: result.reports.map((r) => safeReport(r)), total: result.total, page, pageSize, pageCount: Math.ceil(result.total / pageSize) } });
});

export const getMyReports = asyncHandler(async (req, res, next) => {
  const authReq = req as AuthRequest;
  return listForUser(authReq.user!.id)(req, res, next);
});

export const getMyReport = asyncHandler(async (req, res) => {
  const authReq = req as AuthRequest;
  const report = await Reports.getOwnedReportById(positiveId(req.params.id), authReq.user!.id);
  if (!report) throw new AppError('Report not found', 404);
  const history = await Reports.getReportHistory(report.id);
  res.json({ status: 'success', data: { ...safeReport(report), history } });
});

export const getAdminReports = asyncHandler(async (req, res) => {
  const page = normalizePage(req.query.page, 1, 1_000_000);
  const pageSize = normalizePage(req.query.pageSize, 10, 100);
  const status = req.query.status ? String(req.query.status) : undefined;
  const pollutionType = req.query.pollutionType ? String(req.query.pollutionType) : undefined;
  if (status && !(REPORT_STATUSES as readonly string[]).includes(status)) throw new AppError('Invalid report status filter', 400);
  if (pollutionType && !(POLLUTION_TYPES as readonly string[]).includes(pollutionType)) throw new AppError('Invalid pollution type filter', 400);
  const from = req.query.submittedFrom ? String(req.query.submittedFrom) : undefined;
  const to = req.query.submittedTo ? String(req.query.submittedTo) : undefined;
  for (const date of [from, to]) if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError('Submission date filters must use YYYY-MM-DD', 400);
  if (from && to && from > to) throw new AppError('Submission date range is invalid', 400);
  const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';
  const result = await Reports.listReports({
    page, pageSize, sort, status, pollutionType, submittedFrom: from, submittedTo: to,
    search: req.query.search ? String(req.query.search).slice(0, 120) : undefined,
    location: req.query.location ? String(req.query.location).slice(0, 200) : undefined,
  });
  res.json({ status: 'success', data: { reports: result.reports.map((r) => safeReport(r, true)), total: result.total, page, pageSize, pageCount: Math.ceil(result.total / pageSize) } });
});

export const getAdminReportStats = asyncHandler(async (_req, res) => {
  res.json({ status: 'success', data: await Reports.getAdminReportStats() });
});

export const getAdminReport = asyncHandler(async (req, res) => {
  const report = await Reports.getReportById(positiveId(req.params.id));
  if (!report) throw new AppError('Report not found', 404);
  const history = await Reports.getReportHistory(report.id);
  res.json({ status: 'success', data: { ...safeReport(report, true), history } });
});

const validateRemarks = (value: unknown, required: boolean) => {
  if (typeof value !== 'string') {
    if (required) throw new AppError('A rejection reason is required', 400);
    return null;
  }
  const text = value.trim();
  if (required && !text) throw new AppError('A rejection reason is required', 400);
  if (text.length > 2000) throw new AppError('Remarks must be 2000 characters or fewer', 400);
  return text || null;
};

export const updateAdminReportStatus = asyncHandler(async (req, res) => {
  const authReq = req as AuthRequest;
  const status = req.body.status as PollutionReportStatus;
  if (!(REPORT_STATUSES as readonly string[]).includes(status) || status === 'Pending') throw new AppError('Select a valid next status', 400);
  const remarks = validateRemarks(status === 'Rejected' ? req.body.rejectionReason : req.body.remarks, status === 'Rejected');
  const result = await Reports.changeReportStatus({ reportId: positiveId(req.params.id), adminId: authReq.user!.id, status, remarks });
  if (result.kind === 'missing') throw new AppError('Report not found', 404);
  if (result.kind === 'invalid-transition') throw new AppError(`Cannot change a report from ${result.currentStatus} to ${status}`, 409);
  await Notifications.createNotification({
    userId: result.report.user_id,
    type: 'report_status',
    title: 'Your pollution report was updated',
    message: `“${result.report.title}” is now marked ${status}.`,
    link: '#my-reports',
  });
  res.json({ status: 'success', data: safeReport(result.report), message: `Report marked ${status}` });
});

export const updateAdminReportRemarks = asyncHandler(async (req, res) => {
  const authReq = req as AuthRequest;
  const remarks = validateRemarks(req.body.remarks, true)!;
  const report = await Reports.updateReportRemarks(positiveId(req.params.id), authReq.user!.id, remarks);
  if (!report) throw new AppError('Report not found', 404);
  await Notifications.createNotification({
    userId: report.user_id,
    type: 'report_response',
    title: 'Administrator response received',
    message: `An administrator added remarks to “${report.title}”.`,
    link: '#my-reports',
  });
  res.json({ status: 'success', data: safeReport(report), message: 'Administrator remarks saved' });
});

export const getReportImage = asyncHandler(async (req, res) => {
  const authReq = req as AuthRequest;
  const id = positiveId(req.params.id);
  const report = authReq.user!.role === 'admin'
    ? await Reports.getReportById(id)
    : await Reports.getOwnedReportById(id, authReq.user!.id);
  if (!report?.image_path) throw new AppError('Report image not found', 404);
  // Only server-generated UUID filenames are valid database storage references.
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(report.image_path)) throw new AppError('Report image not found', 404);
  let bytes: Buffer;
  try { bytes = await readFile(path.join(imageDirectory(), report.image_path)); }
  catch { throw new AppError('Report image not found', 404); }
  const detected = fileInfo(bytes);
  if (!detected) throw new AppError('Report image not found', 404);
  res.set({ 'Content-Type': detected.type, 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  res.send(bytes);
});
