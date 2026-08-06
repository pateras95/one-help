# OneHelp — Local Development Guide

This is the single guide to get the **entire OneHelp project** (frontend + backend +
database) running on your machine. It assumes you have never seen this repository
before. Every command is copy-paste friendly.

---

## 1. Project Overview

OneHelp has three moving parts you run locally, plus one optional GUI tool:

| Part | What it is | Lives in |
|---|---|---|
| **Frontend** | Vue 3 + Vuetify 3 web app (volunteers, organizers, admins) | `frontend/` |
| **Backend** | Spring Boot 3 REST API (Java 21) | `backend/` |
| **MySQL** | MySQL 8 database, schema managed by Flyway | your local MySQL install |
| **phpMyAdmin** | Optional web GUI for browsing the MySQL database | not part of this repo — see § 9 |

**How they communicate:**

```
Browser  ──HTTP──▶  Frontend (Vite dev server)
                         │
                         │  axios calls to VITE_API_BASE_URL
                         ▼
                    Backend (Spring Boot, port 8080)
                         │
                         │  JDBC (MySQL Connector/J)
                         ▼
                    MySQL 8 (port 3306)
```

The frontend never talks to MySQL directly — it only calls the backend's REST API. The
backend is the only thing that ever touches the database.

As of this guide, the backend exposes **no business endpoints yet** — only
`/actuator/health` and the Swagger/OpenAPI documentation. The frontend still runs
entirely on its own local mock data. Wiring the two together happens feature by feature
(see § 15).

---

## 2. Requirements

Install these before doing anything else:

- **Ubuntu** (or any Linux distribution — commands below assume `apt`)
- **Java 21 (JDK)** — required by the backend
- **Node.js 22** and **npm** — required by the frontend (see `frontend/.nvmrc` /
  `frontend/package.json`'s `engines.node`)
- **MySQL 8** — required by the backend
- **Git**

Recommended editors (either works, use whichever you prefer):

- **IntelliJ IDEA** — best experience for the `backend/` Spring Boot project
- **VS Code** — best experience for the `frontend/` Vue project

Check what you already have:

```bash
java -version
node -v
npm -v
mysql --version
git --version
```

If `java -version` doesn't show `21`, or `node -v` doesn't show `v22.x`, install the
correct version before continuing — mismatched versions are the #1 cause of "it works
on my machine but not this one" (see § 14).

---

## 3. Folder Structure

```
one-help/
├── frontend/    Vue 3 + Vuetify 3 web application (volunteer/organizer/admin UI)
├── backend/     Spring Boot 3 + MySQL + Flyway REST API
└── docs/        Product and technical documentation (architecture, discovery, reports)
```

- **`/frontend`** — everything the browser runs. `src/features/` holds feature-oriented
  code (components, mock services, Pinia stores per domain). Currently runs entirely on
  local mock data; no real backend calls yet.
- **`/backend`** — the Spring Boot project. `src/main/java/com/onehelp/backend/` is the
  Java source (organized by domain package: `users/`, `auth/`, `common/`).
  `src/main/resources/` holds `application*.yml` and the Flyway migrations
  (`db/migration/`).
- **`/docs`** — everything about *why* things are built the way they are:
  `backend-architecture/` (approved design docs), `backend-discovery/` (what the
  frontend mocks expect from a real backend), and `reports/` (a dated report for every
  completed phase of work).

---

## 4. First Time Setup

Run these in order, from the repository root.

**1. Clone the repository**

```bash
git clone git@github.com:pateras95/one-help.git
cd one-help
```

**2. Install frontend dependencies**

```bash
cd frontend
npm install
cd ..
```

**3. Install backend dependencies**

No manual step needed — the backend uses the **Maven Wrapper**, which downloads
everything it needs the first time you run it (see § 7). You do **not** need Maven
installed globally.

**4. Create `backend/.env`**

```bash
cp backend/.env.example backend/.env
```

Then open `backend/.env` and fill in real local values — see § 5 for what each
variable means. At minimum, set a real `DB_PASSWORD` (matching the MySQL user you
create in the next step) and a real `JWT_SECRET` (generate one with
`openssl rand -base64 48`). **Never commit `backend/.env`** — it's already listed in
`.gitignore`.

**5. Create the database and application user**

Connect to MySQL as an admin user (e.g. `root`) and run:

```sql
CREATE DATABASE onehelp CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'onehelp'@'localhost' IDENTIFIED BY 'put-the-same-password-here-as-in-.env';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP
  ON onehelp.* TO 'onehelp'@'localhost';
FLUSH PRIVILEGES;
```

Never point the application at the `root` account — always use this dedicated
`onehelp` user with only the grants above.

**6. Run the Flyway migration**

You don't run Flyway by hand — it runs automatically the first time you start the
backend (see § 7 and § 10). Just start the backend once and check the logs for:

```
Schema onehelp is up to date. No migration necessary.
```

or, on a truly empty database:

```
Successfully applied 1 migration to schema `onehelp`
```

**7. Start everything** — see § 6 and § 7 below.

---

## 5. Environment Variables

All backend configuration comes from `backend/.env` (copied from
`backend/.env.example`, never committed). Every variable the app actually reads:

| Variable | What it does |
|---|---|
| `DB_HOST` | Hostname of the MySQL server. `localhost` for a local install. |
| `DB_PORT` | MySQL port. `3306` is the MySQL default. |
| `DB_NAME` | The database name the app connects to. Must match the `CREATE DATABASE` you ran in § 4. |
| `DB_USERNAME` | The MySQL user the app authenticates as. Must be the dedicated `onehelp` user — never `root`. |
| `DB_PASSWORD` | That user's password. Must match what you set in `CREATE USER`. |
| `JWT_SECRET` | A long random secret used to sign JWT access/refresh tokens. Must be at least 32 characters — the app refuses to start with anything shorter. No authentication endpoints exist yet, but the property is validated at startup regardless. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of frontend origins allowed to call the API from a browser. Must include whatever URL the frontend is actually running at (see the port note in § 6). |

The frontend has its own, separate `.env` (copied from `frontend/.env.example`):

| Variable | What it does |
|---|---|
| `VITE_API_BASE_URL` | Base URL the frontend will eventually call the backend at. Defaults to `http://localhost:8080/api/v1`. |
| `VITE_MAP_TILE_URL` | Public OpenStreetMap tile server, used by the map view. Fine for local development. |

---

## 6. Running the Frontend

```bash
cd frontend
npm run dev
```

**Expected URL:** `frontend/vite.config.js` explicitly pins the dev server to
**`http://localhost:8080`** — this is *not* Vite's usual default (`5173`).

> ⚠️ **Port conflict with the backend.** The backend also runs on port **8080** (§ 7).
> You cannot start both on their default configuration at the same time. See the
> workaround in § 14 ("Port already in use").

**Common problems:**

- `npm install` prints engine/version warnings → your Node version doesn't match
  `engines.node` in `package.json` (`>=22`). Install Node 22 (e.g. via `nvm install 22`).
- Blank page / console errors about Vuetify or missing plugins → delete
  `frontend/node_modules` and re-run `npm install`.
- Port `8080` already bound → see § 14.

---

## 7. Running the Backend

From `backend/`, with `backend/.env` already filled in (§ 4):

```bash
cd backend
set -a && source .env && set +a   # loads DB_*/JWT_SECRET/CORS_ALLOWED_ORIGINS into the shell
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

(In IntelliJ: run the `OneHelpBackendApplication` main class with active profile
`local` and the same variables set as "Environment variables" in the run configuration
— no need to `source .env` manually there.)

**Profiles:**

- `local` — the one you use every day. Enables Swagger/OpenAPI and verbose
  (`DEBUG`-level) SQL/application logging.
- *(no profile / default)* — Swagger disabled, logging at `INFO`. Used for anything
  that isn't local development.
- `test` — used automatically by the test suite (`./mvnw clean verify`); expects a
  reachable MySQL instance, points at `onehelp_test` by default.

**Expected logs on a successful start** (abridged):

```
Starting OneHelpBackendApplication using Java 21...
The following 1 profile is active: "local"
...
onehelp-hikari - Start completed.
Database: jdbc:mysql://localhost:3306/onehelp (MySQL 8.0)
Schema onehelp is up to date. No migration necessary.
...
Tomcat started on port 8080 (http) with context path '/'
Started OneHelpBackendApplication in ~5 seconds
```

No `WARN` or stack trace should appear. If you see
`APPLICATION FAILED TO START`, jump to § 14.

**Expected URL:** `http://localhost:8080`
**Swagger URL:** `http://localhost:8080/swagger-ui.html`
**Actuator health URL:** `http://localhost:8080/actuator/health`

---

## 8. MySQL

**Verify MySQL is running:**

```bash
systemctl status mysql
```

Look for `Active: active (running)`. If it's not running:

```bash
sudo systemctl start mysql
```

**Connect from the terminal:**

```bash
mysql -u onehelp -p -h localhost -P 3306 onehelp
```

(enter the same password you put in `backend/.env`)

**Common commands, once connected:**

```sql
SHOW DATABASES;
USE onehelp;
SHOW TABLES;
DESCRIBE users;
SELECT * FROM flyway_schema_history;
```

---

## 9. phpMyAdmin

phpMyAdmin is **not part of this repository** — there's no Docker service or config
file for it in `one-help/`. It's a general-purpose MySQL web GUI you can optionally
install yourself if you prefer clicking through tables over the `mysql` CLI in § 8.

**To install it on Ubuntu:**

```bash
sudo apt install phpmyadmin
```

The installer walks you through picking a web server (Apache is the common choice)
and asks whether to let the installer configure the database for phpMyAdmin's own
bookkeeping — either answer works for local development.

**Default URL:** depends on how the installer configures your web server — typically
`http://localhost/phpmyadmin` (Apache root install) or a dedicated port if you set one
up in your own Apache/Nginx site config. Check what the installer printed at the end,
or your web server's site configuration.

**Login credentials:** phpMyAdmin's login form asks for a MySQL username and password
— use the same `DB_USERNAME`/`DB_PASSWORD` from your `backend/.env` (the `onehelp`
application user), not a system/Linux login.

**What it's useful for:** browsing table contents, inspecting `flyway_schema_history`
visually, running ad-hoc `SELECT`s while debugging, and checking indexes/constraints
without memorizing `information_schema` queries. Everything it can do, the `mysql` CLI
in § 8 can also do — it's a convenience, never a requirement.

---

## 10. Flyway

**What Flyway does:** Flyway is the *only* thing allowed to create or change database
tables in this project. Hibernate is configured with `ddl-auto: validate` — it checks
the schema matches the entities and fails startup if it doesn't, but it never creates
or alters a table itself. Every schema change is a plain `.sql` file, applied in order,
exactly once, ever.

**How migrations work:** on every backend startup, Flyway looks at
`flyway_schema_history` (a table it manages itself) to see which migrations have
already run, then applies any new ones it finds in order. Once a migration has been
applied, its checksum is locked in — Flyway will refuse to start if that file's content
changes afterward.

**Where migrations live:** `backend/src/main/resources/db/migration/`. Currently:

```
V1__foundation_and_auth_schema.sql
```

**How to create a new migration:** add a new `.sql` file in that same folder with the
next version number. Never edit an already-applied file.

**Naming convention:** `V<version>__<description>.sql` — capital `V`, the version
number, **two** underscores, then a lowercase, underscore-separated description. Next
one after `V1` would be:

```
V2__add_organizations_table.sql
```

**What should NEVER be done:**

- Never edit a migration file that has already been applied (i.e. already committed
  and possibly already run against someone's local database). Flyway will detect the
  checksum mismatch and refuse to start.
- Never delete or renumber an existing migration.
- Never let Hibernate auto-generate DDL (`ddl-auto` must stay `validate`, never
  `update`/`create`/`create-drop`).
- Never manually edit the database schema outside of a migration file — if you ran an
  `ALTER TABLE` by hand to "just try something," write the equivalent migration
  afterward so everyone else's database matches, and never leave a manual production
  change undocumented.

---

## 11. Daily Development Workflow

```
Start MySQL
     ↓
Run Backend (./mvnw spring-boot:run -Dspring-boot.run.profiles=local)
     ↓
Run Frontend (npm run dev)
     ↓
Open Swagger (http://localhost:8080/swagger-ui.html)
     ↓
Open phpMyAdmin (optional, if installed)
     ↓
Develop
     ↓
Test (./mvnw clean verify · npm run lint)
     ↓
Commit
```

---

## 12. Useful URLs

| What | URL |
|---|---|
| Frontend | http://localhost:8080 *(see the port-conflict note in § 6/§ 14)* |
| Backend | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |
| Actuator (base) | http://localhost:8080/actuator *(requires authentication — no login exists yet, so this 403s until the auth phase ships)* |
| Actuator Health | http://localhost:8080/actuator/health |
| phpMyAdmin | depends on your local install — see § 9 |

---

## 13. Useful Commands

**Git**

```bash
git status
git pull
git checkout -b feature/my-change
git add <file>
git commit -m "feat: ..."
git push -u origin feature/my-change
```

**Maven Wrapper** (run from `backend/`)

```bash
./mvnw clean verify                                   # full build + tests
./mvnw spring-boot:run -Dspring-boot.run.profiles=local  # run the app
./mvnw -v                                              # confirm the wrapper works
```

**MySQL**

```bash
sudo systemctl status mysql
sudo systemctl restart mysql
mysql -u onehelp -p -h localhost -P 3306 onehelp
```

**npm** (run from `frontend/`)

```bash
npm install
npm run dev
npm run lint
npm run build
```

**Spring Boot**

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=local   # local profile
./mvnw spring-boot:run                                    # default profile, Swagger disabled
```

---

## 14. Troubleshooting

**Java not found**
`java -version` errors or shows the wrong major version. Install JDK 21
(`sudo apt install openjdk-21-jdk`) and make sure it's first on your `PATH`
(`update-java-alternatives --list` to see what's installed,
`sudo update-java-alternatives --set <name>` to switch).

**MySQL not running**
`mysql -u onehelp -p ...` hangs or errors with "Can't connect to MySQL server."
Run `sudo systemctl status mysql`; if it's not active, `sudo systemctl start mysql`.

**Port already in use**
Both the frontend (`vite.config.js`) and the backend (`application.yml`) are
configured for port **8080** — running both at once with no override *will* fail with
`Address already in use`. Two options:

1. Run the frontend on a different port for this session only (no file edits needed):
   ```bash
   cd frontend
   npm run dev -- --port 5173
   ```
   Then update `CORS_ALLOWED_ORIGINS=http://localhost:5173` in `backend/.env` to match
   (this is already the value in `backend/.env.example`, so if you never changed it,
   there's nothing to do).
2. Or find and stop whatever is already bound to 8080:
   ```bash
   ss -tlnp | grep 8080
   kill <pid>
   ```

**Flyway migration failed**
Usually one of: MySQL isn't reachable (check § "MySQL not running" above), the
`onehelp` user lacks a grant Flyway needs (re-check the `GRANT` statement in § 4), or
an already-applied migration file was edited after the fact (checksum mismatch —
Flyway will say so explicitly; never edit an applied migration, see § 10).

**Swagger not opening**
Confirm you started the backend with `-Dspring-boot.run.profiles=local` — Swagger is
disabled by default and only enabled under the `local` profile. Confirm the app fully
started (look for `Started OneHelpBackendApplication` in the logs) before loading the
URL.

**Database authentication errors**
`Access denied for user 'onehelp'@'localhost'` means the password in `backend/.env`
doesn't match what MySQL actually has for that user. Reset it if needed:
```sql
ALTER USER 'onehelp'@'localhost' IDENTIFIED BY 'new-password';
```
then update `backend/.env` to match.

**Maven Wrapper issues**
`./mvnw: Permission denied` → `chmod +x mvnw`. The first run downloads Maven itself
into `~/.m2/wrapper/` — if that fails, check you have network access to
`repo.maven.apache.org` (the wrapper needs it once; afterward it's cached locally).

---

## 15. Future Development Flow

This is the workflow the project follows from here on:

- The **frontend already exists**, fully built against local mock data and mock
  services.
- The **backend will replace those mocks incrementally**, one feature/domain at a
  time — never all at once.
- **Every completed backend feature is immediately connected to the existing
  frontend** (its mock service swapped for a real `axios` call) rather than left
  backend-only and integrated later.
- **Both frontend and backend always run locally together** during development — this
  guide's § 11 workflow is the default loop, every day.
- **Every backend feature is manually verified immediately after implementation** —
  through Swagger/curl at minimum, and through the connected frontend once that
  feature's mock has been swapped out — not left for a later, separate testing pass.
