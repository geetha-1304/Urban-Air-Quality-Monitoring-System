import { PoolClient } from 'pg';
import { pool } from '../config/db';
import { PollutionReport, PollutionReportStatus } from '../types';

export interface ReportFilters {
  search?: string;
  status?: string;
  pollutionType?: string;
  location?: string;
  submittedFrom?: string;
  submittedTo?: string;
  sort?: 'oldest' | 'newest';
  page: number;
  pageSize: number;
}

const reportSelect = `SELECT r.*, u.username AS submitted_by, u.email AS submitter_email
  FROM pollution_reports r JOIN users u ON u.id = r.user_id`;

const reportFilterSql = (filters: ReportFilters, ownerId?: number) => {
  const values: unknown[] = [];
  const where: string[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    where.push(sql.replace('?', `$${values.length}`));
  };
  if (ownerId !== undefined) add('r.user_id = ?', ownerId);
  if (filters.search) {
    values.push(`%${filters.search}%`);
    const parameter = `$${values.length}`;
    where.push(`(r.title ILIKE ${parameter} OR r.location ILIKE ${parameter} OR u.username ILIKE ${parameter})`);
  }
  if (filters.status) add('r.status = ?', filters.status);
  if (filters.pollutionType) add('r.pollution_type = ?', filters.pollutionType);
  if (filters.location) add('r.location ILIKE ?', `%${filters.location}%`);
  if (filters.submittedFrom) add('r.created_at >= ?::timestamptz', filters.submittedFrom);
  if (filters.submittedTo) add('r.created_at < (?::date + INTERVAL \'1 day\')', filters.submittedTo);
  return { values, whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '' };
};

export const createReport = async (input: {
  userId: number; title: string; pollutionType: string; location: string;
  mobileNumber: string; latitude: number | null; longitude: number | null;
  description: string; incidentAt: string; imagePath: string | null;
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query<PollutionReport>(
      `INSERT INTO pollution_reports(user_id,title,pollution_type,location,mobile_number,latitude,longitude,description,incident_at,image_path)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [input.userId, input.title, input.pollutionType, input.location, input.mobileNumber, input.latitude, input.longitude, input.description, input.incidentAt, input.imagePath],
    );
    const report = inserted.rows[0];
    await client.query(
      `INSERT INTO pollution_report_history(report_id,action,new_status) VALUES($1,'submitted','Pending')`,
      [report.id],
    );
    await client.query('COMMIT');
    return report;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const listReports = async (filters: ReportFilters, ownerId?: number) => {
  const { values, whereSql } = reportFilterSql(filters, ownerId);
  const order = filters.sort === 'oldest' ? 'ASC' : 'DESC';
  const offset = (filters.page - 1) * filters.pageSize;
  const pageValues = [...values, filters.pageSize, offset];
  const [rows, count] = await Promise.all([
    pool.query(`${reportSelect} ${whereSql} ORDER BY r.created_at ${order}, r.id ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, pageValues),
    pool.query(`SELECT COUNT(*)::int AS total FROM pollution_reports r JOIN users u ON u.id=r.user_id ${whereSql}`, values),
  ]);
  return { reports: rows.rows, total: count.rows[0].total as number };
};

export const getReportById = async (id: number) =>
  (await pool.query(`${reportSelect} WHERE r.id=$1`, [id])).rows[0] ?? null;

export const getOwnedReportById = async (id: number, ownerId: number) =>
  (await pool.query(`${reportSelect} WHERE r.id=$1 AND r.user_id=$2`, [id, ownerId])).rows[0] ?? null;

export const getReportHistory = async (reportId: number) =>
  (await pool.query(
    `SELECT h.id,h.action,h.previous_status,h.new_status,h.remarks,h.created_at,
       u.username AS admin_username
     FROM pollution_report_history h LEFT JOIN users u ON u.id=h.admin_id
     WHERE h.report_id=$1 ORDER BY h.created_at ASC,h.id ASC`, [reportId],
  )).rows;

export const getAdminReportStats = async () => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status='Pending')::int AS pending,
       COUNT(*) FILTER (WHERE status='Under Review')::int AS under_review,
       COUNT(*) FILTER (WHERE status='Resolved')::int AS resolved,
       COUNT(*) FILTER (WHERE status='Rejected')::int AS rejected
     FROM pollution_reports`,
  );
  return result.rows[0];
};

export const changeReportStatus = async (input: {
  reportId: number; adminId: number; status: PollutionReportStatus; remarks: string | null;
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query<PollutionReport>('SELECT * FROM pollution_reports WHERE id=$1 FOR UPDATE', [input.reportId]);
    const current = existing.rows[0];
    if (!current) { await client.query('ROLLBACK'); return { kind: 'missing' as const }; }
    const transitions: Record<PollutionReportStatus, PollutionReportStatus[]> = {
      Pending: ['Under Review', 'Resolved', 'Rejected'],
      'Under Review': ['Resolved', 'Rejected'],
      Resolved: [], Rejected: [],
    };
    if (!transitions[current.status].includes(input.status)) {
      await client.query('ROLLBACK');
      return { kind: 'invalid-transition' as const, currentStatus: current.status };
    }
    const updated = await client.query<PollutionReport>(
      `UPDATE pollution_reports SET status=$1, status_admin_id=$2, status_changed_at=NOW(),
       admin_remarks=COALESCE($3,admin_remarks), updated_at=NOW() WHERE id=$4 RETURNING *`,
      [input.status, input.adminId, input.remarks, input.reportId],
    );
    await client.query(
      `INSERT INTO pollution_report_history(report_id,action,previous_status,new_status,admin_id,remarks)
       VALUES($1,'status_changed',$2,$3,$4,$5)`,
      [input.reportId, current.status, input.status, input.adminId, input.remarks],
    );
    await client.query('COMMIT');
    return { kind: 'updated' as const, report: updated.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateReportRemarks = async (reportId: number, adminId: number, remarks: string) => {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    const selected = await client.query<PollutionReport>('SELECT * FROM pollution_reports WHERE id=$1 FOR UPDATE', [reportId]);
    const current = selected.rows[0];
    if (!current) { await client.query('ROLLBACK'); return null; }
    const updated = await client.query<PollutionReport>(
      'UPDATE pollution_reports SET admin_remarks=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [remarks, reportId],
    );
    await client.query(
      `INSERT INTO pollution_report_history(report_id,action,previous_status,new_status,admin_id,remarks)
       VALUES($1,'remarks_updated',$2,$2,$3,$4)`, [reportId, current.status, adminId, remarks],
    );
    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
