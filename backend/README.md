# OneHelp Backend

Spring Boot 3 / Java 21 / MySQL 8 backend for OneHelp. This is the foundation phase:
project skeleton, database config, the `users`/`refresh_tokens` schema, and a security/
error-handling skeleton — no working authentication endpoints yet. See
`docs/backend-architecture/` for the full design and
`docs/reports/2026-08-06-mysql-backend-foundation.md` for what this phase built.

## Prerequisites

- **Java 21** (JDK)
- **MySQL 8** — either installed locally (Option A) or via Docker (Option B)
- **IntelliJ IDEA** — optional, but recommended
- **Docker** — optional, only needed if you choose Option B for MySQL

You do **not** need Maven installed — this project includes the Maven Wrapper
(`./mvnw`), which downloads the correct Maven version automatically.

---

## Option A — Locally installed MySQL

Conceptual steps for Ubuntu (adjust to your own distro/package manager as needed):

1. **Install MySQL**:
   ```
   sudo apt update
   sudo apt install mysql-server
   ```
2. **Start the service**:
   ```
   sudo systemctl enable --now mysql
   sudo systemctl status mysql
   ```
3. **Create the database and a dedicated application user** (never use the `root`
   account from the Spring application):
   ```sql
   CREATE DATABASE onehelp CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   CREATE USER 'onehelp'@'localhost' IDENTIFIED BY 'changeme';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP
     ON onehelp.* TO 'onehelp'@'localhost';
   FLUSH PRIVILEGES;
   ```
   These are the permissions Flyway/Hibernate need for local development (creating
   and evolving tables via migrations); the application itself only ever does
   `SELECT`/`INSERT`/`UPDATE`/`DELETE` at runtime.
4. **Configure environment variables** (see `.env.example` — copy it to `.env` or
   export the same variables in your shell):
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=onehelp
   DB_USERNAME=onehelp
   DB_PASSWORD=changeme
   JWT_SECRET=<a long random value, at least 32 characters>
   CORS_ALLOWED_ORIGINS=http://localhost:5173
   ```
5. **Start Spring Boot** — see § Maven commands or § IntelliJ below.

---

## Option B — Docker Compose MySQL

Docker is used **only** to run MySQL — the Spring Boot application always runs
directly via Maven or IntelliJ, never inside a container, in local development.

From the repository root (where `compose.yml` lives):

```
# Start MySQL
docker compose up -d mysql

# Check status
docker compose ps

# View logs
docker compose logs -f mysql

# Stop, keeping data
docker compose down

# Delete the database volume — DESTRUCTIVE, irreversible, all data is lost
docker compose down -v
```

Set the same environment variables as Option A (`DB_HOST=localhost`, `DB_PORT=3306`,
`DB_NAME=onehelp`, `DB_USERNAME=onehelp`, plus `DB_PASSWORD` and
`MYSQL_ROOT_PASSWORD`, which `compose.yml` requires you to set explicitly — it will
refuse to start otherwise). The application's configuration is identical whether
MySQL is local-installed or Docker-Composed.

---

## Maven commands

From `backend/`:

```
./mvnw clean verify
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

## IntelliJ IDEA

1. **File → Open** and select `backend/pom.xml` (open as a project).
2. Confirm the project SDK is set to **Java 21** (File → Project Structure → Project).
3. Create a **Run/Debug Configuration** for `OneHelpBackendApplication`:
   - Set the active Spring profile to `local` (Active profiles: `local`).
   - Provide the environment variables from `.env.example` in the configuration's
     "Environment variables" field (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`,
     `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`).
4. Run `OneHelpBackendApplication`.

## URLs

| What | URL |
|---|---|
| Backend | http://localhost:8080 |
| Health | http://localhost:8080/actuator/health |
| Swagger UI (local profile only) | http://localhost:8080/swagger-ui.html |
| Future API base path | http://localhost:8080/api/v1 |

## Simple future CI (documented, not implemented in this phase)

A minimal GitHub Actions setup, once introduced, would look like:

**Backend job**: checkout → set up Java 21 → cache Maven dependencies → start a MySQL
service container (only for steps that run integration tests against a real
database) → run `./mvnw clean verify`.

**Frontend job**: set up Node → install dependencies → `npm run lint` → `npm run
build`.

No Kubernetes, container registry publishing, deployment pipeline, infrastructure-as-
code, or complex matrix build is planned — a build-only workflow is the deliberate
scope until there's a real reason to grow it.
