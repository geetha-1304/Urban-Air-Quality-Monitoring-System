# AirWatch backend

Express and TypeScript API with PostgreSQL for the app's structured records and MongoDB for raw air-quality provider payloads.

## Data ownership

- PostgreSQL stores users, stations, normalized readings, pollution reports, and report status/remarks history. It is the source of truth used by API routes and the frontend.
- MongoDB stores the original JSON response from Open-Meteo for each station and observation time, so provider fields can be reviewed without changing the relational schema.

The service creates the PostgreSQL tables and indexes when it starts. It seeds 15 Chennai locations when missing. Every 15 minutes it fetches location-based CAMS estimates and stores normalized values in PostgreSQL plus the raw response in MongoDB. These values are model estimates, not physical sensor measurements. The provider updates hourly.

Pollution report uploads accept JPEG, PNG, and WebP images up to 5 MB. The backend validates image signatures, stores files under `uploads/reports` using generated names, and serves them only to the report owner or an administrator. Docker Compose persists these files in the `report_uploads` volume. Public registration creates regular users; promote an administrator account manually with the SQL command in the root README.

## Configure and start

Copy `.env.example` to `.env`. Set `DB_PASSWORD` (or use `DATABASE_URL`), `MONGODB_URI`, and a private `JWT_SECRET`. Then run:

```bash
npm install
npm run dev
```

The API listens on `http://localhost:5000/api`. MongoDB and PostgreSQL must both be running and reachable.
