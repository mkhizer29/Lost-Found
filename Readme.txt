# IBA Lost & Found — Project README

This repository contains the Lost & Found application for IBA campus: an Oracle-backed Flask API and a React frontend. The SQL files under `sql/` define the schema and demo data used by the application.

This README provides a concise quick-start for developers who want to run the project locally, set up the database schema, and run the frontend (Vite recommended). It also lists useful troubleshooting tips and important notes about secrets and environment configuration.

---

## Repository layout (important files)

- `run.py` — Flask app entrypoint (calls `app.create_app()`).
- `app/` — Flask application package; main API routes in `app/routes_basic.py`.
- `db.py` — Oracle connection helper (reads credentials from `config.py`).
- `config.py` — local config file (DB credentials and other secrets). **Do not commit this file publicly.**
- `sql/` — SQL scripts to create schema and demo data. See `Tables.sql` for the full schema (includes `APP_USER`, `ITEM`, `REPORT`, etc.).
- `frontend/` — React frontend (you may recreate this with Vite for a fresh dev setup).

---

## Quick start — Backend (Flask)

1. Create and activate a Python virtual environment (PowerShell):

```powershell
cd /d D:\Lost-Found
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
```

2. Install backend dependencies:

```powershell
pip install flask flask-cors python-oracledb
```

3. Configure DB credentials:
- Edit `config.py` to set `DB_USER`, `DB_PASSWORD`, and `DB_DSN`. Treat these as secrets and do not share them.

4. Run the Flask app (development mode):

```powershell
python run.py
```

5. Verify the server is running:

```powershell
# from PowerShell (or use browser)
Invoke-RestMethod http://127.0.0.1:5000/ping
Invoke-RestMethod http://127.0.0.1:5000/api/db-test
```

If `db-test` returns an error, confirm Oracle is running, `DB_DSN` is reachable, and `python-oracledb` is correctly installed. For `python-oracledb` you may need Oracle Instant Client depending on your environment.

---

## Database setup (Oracle)

Run these scripts in the database client (SQL*Plus, SQL Developer) in the following order. Replace `--` comments with the commands supported by your client:

1. Create tables and constraints:

```sql
-- Run: sql/02_create_tables.sql
@sql/02_create_tables.sql
```

2. Insert lookup/master data:

```sql
-- Run: sql/03_insert_lookup_data.sql
@sql/03_insert_lookup_data.sql
```

3. (Optional) Insert demo scenario for testing:

```sql
-- Run: sql/04_insert_demo_scenario.sql
@sql/04_insert_demo_scenario.sql
```

4. Apply business rules and triggers:

```sql
-- Run: sql/06_business_rules.sql
@sql/06_business_rules.sql
```

5. Example queries (for exploring the data):

```sql
-- Run: sql/05_example_queries.sql
@sql/05_example_queries.sql
```

---

## Quick start — Frontend (recommended: Vite)

The original project used Create React App; a fresh Vite scaffold is recommended to avoid legacy `react-scripts` issues.

1. Create a Vite project and install dependencies (PowerShell):

```powershell
cd /d D:\Lost-Found
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

2. Copy your modified frontend files into the new scaffold. Example (PowerShell):

```powershell
# Back up the new scaffold's src first
robocopy frontend\src frontend\src_backup /E
# Copy your edited files from the repo backup (adjust paths as needed)
Copy-Item ..\frontend_backup\App.js frontend\src\App.jsx -Force
Copy-Item ..\frontend_backup\App.css frontend\src\App.css -Force
Copy-Item ..\frontend\src\index.css frontend\src\index.css -Force
```

3. Start the Vite dev server:

```powershell
cd /d D:\Lost-Found\frontend
npm run dev
```

Open the URL shown in the terminal (commonly `http://localhost:5173`). If the app errors about environment variables, convert any `REACT_APP_*` variables to `VITE_*` and access via `import.meta.env.VITE_*`.

---

## Useful API endpoints (backend)

- `GET /ping` — health check
- `GET /api/db-test` — DB connectivity test
- `GET /api/categories` — list active categories
- `GET /api/locations` — list active locations
- `GET /api/reports` — list reports for the frontend
- `POST /api/reports` — create a report (multipart/form-data; expected fields documented in code)

Use Postman, curl, or the React UI to exercise these endpoints after starting both servers.

---

## Development tips & troubleshooting

- If the frontend fails with missing modules or `react-scripts` errors, remove `node_modules` and `package-lock.json` and reinstall from a clean scaffold rather than using `npm audit fix --force`.
- If Flask errors when connecting to Oracle, check `config.py` values and ensure Oracle listener is reachable. For `python-oracledb` thick mode you may need Instant Client; thin mode requires no client libraries but has different configuration.
- Keep secrets out of source control. Replace `config.py` with environment-based configuration for production.
- For quick local testing of report creation without auth, the backend accepts `reporter_id` in the form data; provide a valid `APP_USER.user_id` while testing.

---

## Contributing and branches

- Create a backup branch before major refactors:

```powershell
cd /d D:\Lost-Found
git checkout -b backup/current-state
git add -A
git commit -m "checkpoint: current project state"
```

- Create a feature branch for the frontend migration:

```powershell
git checkout -b feat/frontend/vite
```

