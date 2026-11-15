# Portfolio demo

The demo is prepared for deployment but is not publicly hosted. The personal phone installation stays separate and demo mode is off by default.

## Try it locally

Configure private SQL/JWT values in `.env` as described in [CONTAINERS.md](CONTAINERS.md), then run:

```powershell
docker compose -f compose.yaml -f compose.demo.yaml up --build -d
```

Open **https://localhost:8443/login** and select **Explore live demo**. Trust Caddy's local root before using persistent sessions or installing the PWA. Stop the ordinary Compose stack first if it already uses port 8443.

The demo uses a separate Compose project, named volumes and a database named `TrainingDemo`. Each visit through the demo button creates a new ordinary User account with eight synthetic workouts. Visitors do not share a login, and ownership rules apply normally. Sessions use the same short-lived JWT and rotating Secure HttpOnly cookie flow as registered accounts.

Creating demo sessions is rate-limited. The login button appears only when the server reports demo mode enabled. Normal installations return 404 for demo creation. Enabling demo mode against any database name other than `TrainingDemo` fails startup. This is a configuration guard, not a substitute for separate server credentials: use a dedicated database and secrets when hosting.

## Before a public launch

1. Choose hosting with a persistent SQL Server/Azure SQL database and container support. Confirm pricing before provisioning anything.
2. Create a dedicated `TrainingDemo` database. Never restore personal workouts into it.
3. Set a private `Jwt__Key` of at least 32 bytes, the SQL connection string and `Demo__Enabled=true` through the host's secret configuration.
4. Apply migrations with the image's `--migrate` command as a deployment job, then start the API.
5. Terminate trusted HTTPS at the hosting proxy. For a direct Caddy deployment, replace `localhost` with the chosen domain and remove `tls internal`; publish only the HTTPS proxy. Trust forwarded headers only from the actual proxy and keep the API port private.
6. Check `/health/live` and `/health/ready`, demo creation, account isolation, cookie refresh and phone layout.
7. Set a retention policy for disposable demo accounts and storage quotas. No scheduled account cleanup is implemented yet; do not leave an unrestricted public demo unattended. Reset only the disposable demo environment between review periods.

The local configuration intentionally binds to loopback and cannot serve as a public deployment without changes. No cloud account, paid resource or public hostname is created by these scripts.

## Interview walkthrough

- Open the demo and explain that the data belongs to a separate visitor account.
- Show mixed kg/lbs exercise history, then save one workout.
- Prepare the offline shell, disable connectivity and queue another workout.
- Reconnect and explain the account/client-ID unique index that prevents duplicate inserts.
- Show the SQL Server migration/concurrency tests and CI reports.
