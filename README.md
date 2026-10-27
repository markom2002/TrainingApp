# FORM — Gym Training Tracker

A personal training journal built with **Angular 19, ASP.NET Core 8, EF Core and SQL Server**. Log workouts and individual exercises, track progress, and manage a private athlete profile. Designed for local use and portfolio demonstrations.

## Features

- **Workout Studio:** 47 exercises across 14 muscle groups, search, body filters, editable Upper/Lower/Full body drafts and front/back male/female sculpture views. Every exercise is available in every presentation.
- **Exercise records:** sets, repetitions or seconds, added weight and exercise order. Each exercise entry uses one sets/reps-or-time/load combination.
- **Dashboard:** monthly totals, previous-month comparison, weekly activity, exercise distribution and progress towards a personal weekly goal.
- **History:** SQL pagination, inclusive date filters, exercise-type filtering, stable sorting and expandable exercise details.
- **Private profiles:** display name, bio, training focus, experience, weekly target and lifetime totals.
- **Authentication and authorization:** short-lived JWTs, rotating refresh cookies, User/Admin roles and ownership checks on workout operations.
- **API documentation:** Swagger examples, response schemas and ProblemDetails errors.

## Run locally

Requirements: .NET 8 SDK, EF CLI, Node.js 22, npm and a local SQL Server instance.

1. Configure your SQL connection in [BE/appsettings.Development.json](BE/appsettings.Development.json), or override it with `ConnectionStrings__DefaultConnection`. The checked-in signing key is for local development; `Jwt__Key` overrides it.
2. Restore dependencies and apply migrations from the repository root:

   ```powershell
   dotnet restore BE/BE.sln
   dotnet ef database update --project BE
   dotnet dev-certs https --trust
   ```

3. Start the backend:

   ```powershell
   dotnet run --project BE --launch-profile https
   ```

4. In a second terminal:

   ```powershell
   cd FE/training-app-frontend
   npm ci
   npm start
   ```

5. Open **https://localhost:4200** and register an account. The API and Swagger are at **https://localhost:7089/swagger**. Both services use HTTPS. Accept the Angular local development certificate in the browser if prompted; opening plain HTTP on port 4200 will not work.

No application hosting account is required. Existing workouts are preserved by the profile/exercise migrations. Example Swagger credentials are sample inputs, not seeded accounts.

## Tests and builds

```powershell
# Repository root: 74 xUnit tests against isolated SQLite databases
dotnet test BE.Tests/BE.Tests.csproj --configuration Release

# Angular directory: 19 tests in Chrome Headless
npm run test:ci
npm run build
npm run build -- --configuration development
```

Chrome/Chromium must be installed for the frontend tests (`CHROME_BIN` can point to a custom installation). Tests do not modify the development SQL Server database.

[GitHub Actions](https://github.com/markom2002/TrainingApp/actions) runs the backend tests, Angular tests and both frontend builds on pushes and pull requests to `master`. Backend TRX reports are retained as workflow artifacts. The workflow can also be started manually.

Browser checks additionally cover login, profile editing, workout creation/history/editing, draft shortcuts and responsive layouts at phone, tablet and desktop widths. SQLite tests complement local SQL Server migration and persistence checks.

## API

| Endpoint | Purpose | Access |
| --- | --- | --- |
| `POST /api/auth/register` | Create an account | Public |
| `POST /api/auth/login` | Issue access JWT and refresh cookie | Public |
| `POST /api/auth/refresh` | Rotate the refresh session | Refresh cookie |
| `POST /api/auth/logout` | Revoke the refresh session | Refresh cookie |
| `GET /api/exercises` | Shared exercise catalog | Signed in |
| `GET, POST /api/trainings` | Paginated history / create workout | Owner |
| `GET, PUT, DELETE /api/trainings/{id}` | Read, update or delete workout | Owner |
| `GET /api/trainings/overview` | Monthly dashboard aggregates | Owner |
| `GET /api/trainings/month` | Weekly totals for a month | Owner |
| `GET, PUT /api/profile` | Read or update personal profile | Owner |
| `GET /api/admin/summary` | Application counts | Admin |
| `GET /health/live` | API process liveness | Public |

History example:

```text
/api/trainings?page=1&pageSize=10&exerciseType=Strength&from=2026-01-01&to=2026-01-31&sortBy=durationMinutes&sortDirection=desc
```

`pageSize` is limited to 100. Supported sort fields are `trainingDate`, `durationMinutes`, `calories` and `intensity`; direction is `asc` or `desc`. Responses contain `items`, `page`, `pageSize`, `totalCount` and `totalPages`. Invalid requests return `400 application/problem+json` with field errors.

Workout requests can include:

```json
{
  "trainingVariant": "Women",
  "exercises": [
    { "exerciseId": "bench-press", "sets": 3, "reps": 10, "weightKg": 40 },
    { "exerciseId": "plank", "sets": 2, "durationSeconds": 30, "weightKg": 0 }
  ]
}
```

A workout supports up to 40 distinct exercises, 1–30 sets, 1–200 repetitions or 1–7200 seconds and 0–1000 kg of added load. Zero weight means no added load. Old session summaries remain valid without exercise entries. Full request examples are in [BE/BE.http](BE/BE.http).

## Security model

Authentication establishes identity; authorization controls access. Anonymous protected requests return **401**, a User requesting Admin statistics gets **403**, and unknown/foreign workout IDs return **404**. Admin accounts retain the same workout ownership restrictions as ordinary users.

JWTs last 15 minutes and stay in frontend memory. Refresh tokens use Secure, HttpOnly, SameSite=Strict cookies; SQL stores their SHA-256 hashes. Rotation consumes the old token and preserves the session's seven-day deadline. Logout revokes the refresh token; issued JWTs retain their remaining lifetime.

Registration always creates a User. Admin provisioning is an explicit database/operator action followed by a new login or refresh. Profile updates cannot change email, password, role or identity. New membership timestamps use UTC; weekly goals count Monday-to-Monday UTC calendar dates.

In Swagger, register and log in, then paste only `token` into **Authorize**; Swagger supplies `Bearer`. The browser manages the refresh cookie, while a refreshed JWT must be copied into Authorize again.

## Structure and optimization

- `BE/Controllers`, `DTOs`, `Services`, `Models`, `Data`: API, validation, business logic and EF persistence.
- `BE/Exercises`: stable exercise IDs and the shared catalog.
- `BE/Migrations`: versioned SQL schema changes.
- `BE.Tests`: HTTP integration and session tests.
- `FE/training-app-frontend/src/app`: standalone Angular pages, shared controls and typed services.
- `FE/training-app-frontend/public/images`: locally stored generated gym imagery and illustrative sculpture atlases.

Angular pages load on demand. The interceptor owns authentication headers and refresh retries. Monthly/profile totals are aggregated in SQL. Image assets were compressed from 7.44 MB of PNGs to **602 KB of WebP** (91.9% reduction); old wrappers, unused routes/templates and 533 overridden CSS declarations were removed. CSS and initial bundles stay within configured build budgets.
