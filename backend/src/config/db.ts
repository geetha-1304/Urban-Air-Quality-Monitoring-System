import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {
  user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'air_quality_db',
});

export const connectPostgres = async () => {
  const client = await pool.connect();
  client.release();
  console.log('Connected to PostgreSQL');
};

export const initializePostgres = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS stations (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, location_name TEXT NOT NULL,
      latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS readings (
      id SERIAL PRIMARY KEY, station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
      aqi INTEGER NOT NULL, pm2_5 DOUBLE PRECISION NOT NULL, pm10 DOUBLE PRECISION NOT NULL,
      no2 DOUBLE PRECISION NOT NULL, so2 DOUBLE PRECISION NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS readings_station_recorded_idx ON readings(station_id, recorded_at DESC);
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
    CREATE TABLE IF NOT EXISTS pollution_reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      title VARCHAR(120) NOT NULL,
      pollution_type VARCHAR(40) NOT NULL CHECK (pollution_type IN ('Industrial Smoke','Vehicle Emissions','Burning Waste','Construction Dust','Chemical Odour','Excessive Smoke','Other')),
      location VARCHAR(200) NOT NULL,
      description TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 2000),
      incident_at TIMESTAMPTZ NOT NULL,
      image_path TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Under Review','Resolved','Rejected')),
      admin_remarks VARCHAR(2000),
      status_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status_changed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE pollution_reports ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(10);
    ALTER TABLE pollution_reports ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
    ALTER TABLE pollution_reports ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    CREATE INDEX IF NOT EXISTS pollution_reports_user_created_idx ON pollution_reports(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS pollution_reports_status_created_idx ON pollution_reports(status, created_at DESC);
    CREATE TABLE IF NOT EXISTS pollution_report_history (
      id SERIAL PRIMARY KEY,
      report_id INTEGER NOT NULL REFERENCES pollution_reports(id) ON DELETE CASCADE,
      action VARCHAR(24) NOT NULL CHECK (action IN ('submitted','status_changed','remarks_updated')),
      previous_status VARCHAR(20),
      new_status VARCHAR(20) NOT NULL CHECK (new_status IN ('Pending','Under Review','Resolved','Rejected')),
      admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      remarks VARCHAR(2000),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS pollution_report_history_report_idx ON pollution_report_history(report_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(40) NOT NULL,
      title VARCHAR(160) NOT NULL,
      message VARCHAR(500) NOT NULL,
      link VARCHAR(160),
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      in_app_notifications BOOLEAN NOT NULL DEFAULT TRUE,
      auto_refresh BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};
