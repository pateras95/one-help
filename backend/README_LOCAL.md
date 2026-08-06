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
| **phpMyAdmin** | Optional web GUI for browsing the MySQL database | not part of this repo — see § 10 |

**How they communicate:**

```
Browser  ──HTTP──▶  Frontend (Vite dev server, port 5173)
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

**Authentication, Users & Roles, and Organizations & Organizer Applications are live
against the real backend** (`POST /auth/register`, `/login`, `/refresh`, `/logout`,
`GET /auth/me`, `GET/PATCH /users/me`, the admin user directory at `/admin/users/**`,
the organizer-application flow at `/organizer-applications/**`, the organizer's own
organization at `/organizations/me`, and admin organization review at
`/admin/organizations/**` — see `docs/backend-discovery/api-authentication.md`,
`docs/backend-discovery/api-users-and-roles.md`, and
`docs/backend-discovery/api-organizations.md`). Every other domain (actions,
participation, attendance, QR, reports, admin activity) still runs entirely on the
frontend's own local mock data; each is wired up feature by feature (see § 16).

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
on my machine but not this one" (see § 15).

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
backend (see § 7 and § 11). Just start the backend once and check the logs for:

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

The frontend has its own, separate env file. Copy `frontend/.env.example` to
`frontend/.env.local` (Vite's own gitignored "local overrides" convention — never
commit it) and fill in real values:

| Variable | What it does |
|---|---|
| `VITE_API_BASE_URL` | Base URL the frontend calls the backend at: `http://localhost:8080/api/v1`. |
| `VITE_DATA_SOURCE` | `api` (default) or `mock`. Read only by `features/auth/services/auth.service.js` — every other domain's service keeps calling its own mock regardless of this value, until that domain's own backend phase ships. |
| `VITE_MAP_TILE_URL` | Public OpenStreetMap tile server, used by the map view. Fine for local development. |

---

## 6. Running the Frontend

```bash
cd frontend
npm run dev
```

**Expected URL:** `http://localhost:5173` — `frontend/vite.config.js` explicitly pins
this (not just Vite's own default) so it's self-documenting and never collides with
the backend's port 8080.

**Common problems:**

- `npm install` prints engine/version warnings → your Node version doesn't match
  `engines.node` in `package.json` (`>=22`). Install Node 22 (e.g. via `nvm install 22`).
- Blank page / console errors about Vuetify or missing plugins → delete
  `frontend/node_modules` and re-run `npm install`.
- Port `5173` already bound → see § 15.

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
`APPLICATION FAILED TO START`, jump to § 15.

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

## 9. Local Administrator Account & Organizer Application Testing (Development Only)

There is **no public administrator-registration endpoint** — by design, permanently
(see `docs/backend-discovery/api-users-and-roles.md`). The only way any account
becomes an `ADMINISTRATOR` is a direct, one-time, local-development-only SQL
statement (below). The only way any account becomes an `ORGANIZER` is the real
organizer-application review workflow (submit → admin approve —
`docs/backend-discovery/api-organizations.md`); there is no SQL shortcut needed or
recommended for that path, since it's fully implemented and testable end to end
through the running application. **Never** expose a role-change endpoint in the
application itself to work around either of these.

**1. Register a normal volunteer account** through the running frontend
(`http://localhost:5173/register`), or via curl:

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Local","lastName":"Admin","email":"YOUR-LOCAL-EMAIL@example.local","password":"YOUR-OWN-PASSWORD"}'
```

**2. Promote it to `ADMINISTRATOR`** directly in MySQL (development-only — this is
exactly the kind of manual step that must never become a public API):

```sql
UPDATE users SET role = 'ADMINISTRATOR' WHERE email = 'YOUR-LOCAL-EMAIL@example.local';
```

**3. Log in again** (or reload the page) so the frontend picks up the new role — the
already-issued access token still has the old role baked in until it naturally
expires (≤15 minutes) or a fresh login/refresh re-reads the live row.

**To revert** a test account back to a normal volunteer once you're done:

```sql
UPDATE users SET role = 'VOLUNTEER' WHERE email = 'YOUR-LOCAL-EMAIL@example.local';
```

(An `ORGANIZER` can only ever be demoted back to `VOLUNTEER` through the real
demotion endpoints — self-service, or an administrator's "remove organizer and
organization" action in the Admin Organizations UI — never a direct SQL update to
`role`, since demotion also deletes the organization row transactionally. Directly
`UPDATE`-ing an organizer's role in SQL without going through the real endpoint would
leave an orphaned `organizations` row behind — always use the application's own
demotion flow, described below.)

### Testing the organizer-application review flow end to end

With the backend, frontend, and MySQL all running:

1. Register a volunteer through `http://localhost:5173/register` (or curl, as above).
2. Log in as that volunteer and open **Γίνε διοργανωτής** (Become Organizer) —
   submit an application.
3. Prepare (or reuse) a local administrator account per steps 1–2 above.
4. Log in as the administrator, open **Οργανώσεις** (Admin Organizations) — the new
   application appears with status **Εκκρεμεί έγκριση** (pending).
5. **Reject** it with a reason to see the rejection-reason display and the
   edit-and-resubmit flow as the volunteer, or **Approve** it directly to promote the
   volunteer to `ORGANIZER` and create the organization.
6. Verify directly in MySQL if you want to confirm the transaction:

   ```sql
   SELECT status, name_el, organizer_user_id FROM organizations;
   SELECT email, role FROM users WHERE email = 'YOUR-VOLUNTEER-EMAIL@example.local';
   ```

7. The promoted user must **log in again** (their old refresh tokens were revoked as
   part of the approval transaction) to receive an `ORGANIZER`-scoped session — this
   is expected, not a bug.
8. To test demotion: as the organizer, open **Η οργάνωσή μου** (My Organization) and
   use the "Become a volunteer again" danger-zone action, or as the administrator, use
   "Remove organizer and organization" from the Admin Organizations card. Either path
   deletes the `organizations` row, resets the user's role to `VOLUNTEER`, and revokes
   their refresh tokens — the same shared backend operation either way.

---

## 10. phpMyAdmin

phpMyAdmin is **not part of this repository** — there's no Docker service or config
file for it in `one-help/`. It's a general-purpose MySQL web GUI you can optionally
install yourself if you prefer clicking through tables over the `mysql` CLI in § 8.
It is **entirely optional and machine-specific** — never required to run the project.

**To install it on Ubuntu:**

```bash
sudo apt install phpmyadmin
```

The installer walks you through picking a web server (Apache is the common choice)
and asks whether to let the installer configure the database for phpMyAdmin's own
bookkeeping — either answer works for local development.

**Default URL:** depends on how the installer configures your web server — typically
`http://localhost/phpmyadmin` (Apache root install) or a dedicated port if you set one
up in your own Apache/Nginx site config (**this particular development machine's own
install is configured at `http://localhost:8082`** — that URL is specific to this
machine's Apache site config, not a project default; a fresh install elsewhere will
very likely land at a different URL, so always check what your own installer printed).

**Login credentials:** phpMyAdmin's login form asks for a MySQL username and password
— use the same `DB_USERNAME`/`DB_PASSWORD` from your `backend/.env` (the `onehelp`
application user), not a system/Linux login.

**What it's useful for:** browsing table contents, inspecting `flyway_schema_history`
visually, running ad-hoc `SELECT`s while debugging, and checking indexes/constraints
without memorizing `information_schema` queries. Everything it can do, the `mysql` CLI
in § 8 can also do — it's a convenience, never a requirement.

---

## 11. Flyway

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

## 12. Daily Development Workflow

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

## 13. Useful URLs

| What | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |
| Actuator (base) | http://localhost:8080/actuator *(requires authentication)* |
| Actuator Health | http://localhost:8080/actuator/health |
| phpMyAdmin | http://localhost:8082 *(this machine's own local install only — see § 10; a different machine's install may live at a different URL)* |

---

## 14. Useful Commands

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

## 15. Troubleshooting

**Java not found**
`java -version` errors or shows the wrong major version. Install JDK 21
(`sudo apt install openjdk-21-jdk`) and make sure it's first on your `PATH`
(`update-java-alternatives --list` to see what's installed,
`sudo update-java-alternatives --set <name>` to switch).

**MySQL not running**
`mysql -u onehelp -p ...` hangs or errors with "Can't connect to MySQL server."
Run `sudo systemctl status mysql`; if it's not active, `sudo systemctl start mysql`.

**Port already in use**
Frontend (5173) and backend (8080) are on separate, non-conflicting ports by default —
if you still see `Address already in use`, something else on your machine already
holds that port. Find and stop it:
```bash
ss -tlnp | grep 5173   # or 8080
kill <pid>
```

**Flyway migration failed**
Usually one of: MySQL isn't reachable (check § "MySQL not running" above), the
`onehelp` user lacks a grant Flyway needs (re-check the `GRANT` statement in § 4), or
an already-applied migration file was edited after the fact (checksum mismatch —
Flyway will say so explicitly; never edit an applied migration, see § 11).

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

## 16. Future Development Flow

This is the workflow the project follows from here on:

- The **frontend already exists**, fully built against local mock data and mock
  services.
- The **backend will replace those mocks incrementally**, one feature/domain at a
  time — never all at once.
- **Every completed backend feature is immediately connected to the existing
  frontend** (its mock service swapped for a real `axios` call) rather than left
  backend-only and integrated later.
- **Both frontend and backend always run locally together** during development — this
  guide's § 12 workflow is the default loop, every day.
- **Every backend feature is manually verified immediately after implementation** —
  through Swagger/curl at minimum, and through the connected frontend once that
  feature's mock has been swapped out — not left for a later, separate testing pass.
