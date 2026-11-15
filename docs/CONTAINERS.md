# Containerized portfolio environment

This environment is separate from the personal phone app and its database. It runs Angular and the API at one HTTPS origin, with SQL Server on a private Compose network. No existing workouts are imported.

## Start

Install Docker Desktop with Linux containers on an x64 machine (SQL Server's Linux image requires x64). Allocate at least 4 GB of memory. These images are for development/portfolio evaluation, including SQL Server Developer edition; assess licensing before production use.

```powershell
Copy-Item .env.example .env
# Edit .env with two private, independently generated values.
docker compose up --build -d
docker compose logs migrate
docker compose logs app
```

The database health check gates migrations. The one-off `migrate` container applies the checked-in EF migrations and must succeed before the API starts. Normal API startup does not apply migrations. The final API image runs as a non-root user and includes the production Angular build, not Node or the .NET SDK.

Open **https://localhost:8443**. Caddy uses a local CA: for persistent login and offline installation, trust its public root on the development machine using the operating system's certificate manager. Export only the public certificate:

```powershell
docker compose cp web:/data/caddy/pki/authorities/local/root.crt ./artifacts/portfolio-root.crt
```

Create the `artifacts` directory first if necessary. Never distribute Caddy's `/data` volume or private keys. `curl -k https://localhost:8443/health/live` can check the server before certificate trust; bypassing certificate checks is not a solution for installing a PWA.

The stack binds only to this computer's loopback address. It does not replace the existing phone launcher or open firewall rules. API and database ports are not published. HTTPS preserves the application's Secure refresh cookies.

## Stop and update

```powershell
docker compose down
docker compose up --build -d
```

The named SQL volume keeps records across restarts. Back it up before schema changes. Do not use `down --volumes` for data you want to retain. Changing `SQL_PASSWORD` in `.env` does not reset an existing SQL volume's SA password.

## Public deployment

This local setup is not a published demo. A public deployment needs a hostname, trusted TLS, persistent database storage, secret configuration and a separate demo database. Do not publish the personal laptop database, certificate keys or local phone setup port. See the demo deployment guide before exposing a server.
