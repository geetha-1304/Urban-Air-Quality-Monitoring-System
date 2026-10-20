# AirWatch — Chennai Air Quality Monitoring

A full-stack air-quality monitoring app built with React, TypeScript, Node.js, Express, and PostgreSQL, with MongoDB for raw provider archives and Redis for short-lived API caching.

## Technology stack

- **React + TypeScript + Vite** — interactive frontend, charts, and typed API client.
- **Node.js + Express.js + TypeScript** — REST API and scheduled provider refresh.
- **PostgreSQL** — source of truth for users, stations, and structured readings.
- **PostgreSQL pollution reports** — incident submissions, administrator remarks, and status audit history.
- **MongoDB** — raw Open-Meteo provider payload archive.
- **Redis** — response cache for frequently read station and air-quality endpoints; mutation endpoints invalidate cached API results. The app still runs without Redis during native development.
- **Docker Compose** — starts the frontend, API, PostgreSQL, MongoDB, and Redis with persistent database volumes.
- **Git** — local source history. Connect a GitHub remote when you have created the repository.

Air quality comes from Open-Meteo’s CAMS model and is refreshed every 15 minutes. These are location-based estimates, not readings from physical sensors. The upstream model updates hourly, so refreshing between provider updates can return the same timestamp. Source: https://open-meteo.com/en/docs/air-quality-api.

## Run everything with Docker

1. Install Docker Desktop and start it.
2. From this project folder, optionally copy `.env.example` to `.env` and change the development credentials.
3. Run `docker compose up --build`.
4. Open `http://localhost:5173`. The API is available at `http://localhost:5000`.
5. Stop the stack with `Ctrl+C`, then run `docker compose down`. Database contents remain in Docker volumes. Use `docker compose down -v` only when you intentionally want to erase them.

The checked-in Compose defaults are for local development only. Set private credentials in `.env` before using the stack in a shared environment.

## Run natively

1. Start PostgreSQL, MongoDB, and Redis locally (or provide reachable instances).
2. Copy `backend/.env.example` to `backend/.env`. Set the database credentials, `MONGODB_URI`, `REDIS_URL`, and a private `JWT_SECRET`.
3. In `backend`, run `npm install` and `npm run dev`.
4. In `frontend`, run `npm install` and `npm run dev`.
5. Open `http://localhost:5173`, create an account, and sign in.

The backend creates its PostgreSQL tables on startup and seeds 15 Chennai locations if they are missing. Redis is optional for native runs; without it, API responses bypass caching.

Public account registration creates a regular `user` account. To grant an account administrator access for a local project review, first create the account, then run this from the project folder (replace `YOUR_USERNAME`):

```powershell
docker compose exec postgres psql -U postgres -d air_quality_db -c "UPDATE users SET role='admin' WHERE username='YOUR_USERNAME';"
```

Sign out and back in after changing a role so the JWT contains the new role. Uploaded evidence is stored privately in the backend's `uploads/reports` directory for native runs, or in the persistent `report_uploads` Docker volume. The image endpoint requires an authenticated report owner or administrator.

### Pollution report mobile number and live location

The Report Pollution form requires a 10-digit Indian mobile number beginning with 6, 7, 8, or 9. It is visible only to the report owner and administrators through authenticated report pages.

The **Use My Live Location** button asks for browser location permission only after the user clicks it. AirWatch reverse-geocodes the current coordinates through the backend and fills the Incident Location field. The user can correct this field before submitting; editing it clears the stored coordinates so stale GPS coordinates are never submitted.

The reverse-geocoding endpoint defaults to OpenStreetMap Nominatim. To use another compatible service, set `REVERSE_GEOCODING_URL` in `.env` or `backend/.env`.

## REST API

All routes are under `/api`:

- `GET /health` — API health check.
- `POST /auth/register`, `POST /auth/login`, `GET /auth/profile` — account and session endpoints.
- `GET /stations`, `GET /stations/:id`, `POST /stations`, `PUT /stations/:id`, `DELETE /stations/:id` — station directory and management.
- `GET /readings`, `GET /readings/:id`, `GET /readings/current/:stationId`, `GET /readings/history/:stationId`, `GET /readings/trends/:stationId` — latest and historical readings.
- `POST /readings/refresh` — request an upstream refresh.
- `POST /readings`, `PUT /readings/:id`, `DELETE /readings/:id` — reading management.
- `POST /reports` — authenticated user submits a pollution report, optionally with one JPEG/PNG/WebP image (up to 5 MB).
- `GET /reports/reverse-geocode?latitude=&longitude=` — authenticated reverse geocoding for the Report Pollution live-location action.
- `GET /reports/my`, `GET /reports/my/:id` — a user lists or views only their own reports.
- `GET /reports`, `GET /reports/admin/stats`, `GET /reports/:id` — administrator report queue, summary counts, and details.
- `PATCH /reports/:id/status`, `PATCH /reports/:id/remarks` — administrator-only status workflow and remarks.
- `GET /reports/:id/image` — private image access for the owner or administrator.

PostgreSQL stores reports and their status/remarks audit history. MongoDB continues to store raw provider payloads; pollution reports are not duplicated there. Email alerts are not configured; report status is shown in My Reports.

Management and refresh routes require the authenticated bearer token. Cached GET responses include an `X-Cache` header (`HIT`, `MISS`, or `BYPASS`).

## Git and GitHub

This folder is initialized as a local Git repository. To publish it, create an empty repository on GitHub and connect it with:

```sh
git remote add origin https://github.com/YOUR-USER/YOUR-REPOSITORY.git
git add .
git commit -m "Initial AirWatch project"
git push -u origin main
```

Do not commit `.env` files or credentials.
