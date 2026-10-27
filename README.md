# Gym Training Tracker

Angular 19 frontend and ASP.NET Core 8 / EF Core / SQL Server API.

## Local setup

1. Install .NET 8 SDK, Node.js and SQL Server.
2. Set `ConnectionStrings__DefaultConnection` to your SQL Server connection string.
3. Set `Jwt__Key` to a private, randomly generated signing key (at least 32 bytes). The checked-in key is a development placeholder; do not use it in deployment.
4. Apply the schema: `dotnet ef database update --project BE`.
5. Trust the development API certificate: `dotnet dev-certs https --trust`.
6. Start the API: `dotnet run --project BE --launch-profile https`.
7. In `FE/training-app-frontend`, run `npm install` and `npm start`.
8. Open `https://localhost:4200` and accept the Angular development certificate. Both frontend and API must use HTTPS for the Secure / SameSite=Strict refresh cookie. Open `https://localhost:7089/swagger` to inspect the API.

## Authentication (upgrade 1)

- Login returns a JWT valid for 15 minutes, held in frontend memory.
- A random refresh token is sent only in a Secure, HttpOnly, SameSite=Strict cookie scoped to `/api/auth`. JavaScript cannot read it.
- SQL stores only the SHA-256 hash. Sessions expire seven days after login; rotation does not extend that deadline.
- `POST /api/auth/refresh` consumes the current token and issues its replacement. Expired or consumed tokens return 401. Optimistic concurrency prevents consuming the same token twice.
- Angular retries an API request once after a 401 and shares one refresh request among concurrent requests. The route guard restores the session after a page reload.
- `POST /api/auth/logout` revokes the current refresh token and deletes the cookie. Previously issued access JWTs can remain valid for their remaining 15-minute lifetime.
- Authentication establishes identity. Authorization controls roles and workout ownership (implemented in upgrade 2).
- Cross-origin deployment requires explicitly revisiting cookie, CORS and CSRF settings; the local setup assumes the same host and HTTPS for both applications.

## Verification

`dotnet test BE.Tests/BE.Tests.csproj` runs xUnit tests against SQLite in memory for token rotation, reuse rejection, expiry, revoked tokens, missing/unknown cookies and logout.

`npm run build` in the frontend checks the production bundle.

## Roadmap

1. Refresh tokens and session lifecycle.
2. User/Admin authorization and ownership tests.
3. Input validation and consistent API errors.
4. Pagination, filtering and sorting.
5. Broader xUnit and frontend coverage.
6. API documentation and examples.
7. GitHub Actions and a deployed demo.
8. Dashboard and progress visualizations.

## Authorization (upgrade 2)

Every existing account and new registration receives the `User` role. Registration ignores any client-supplied role. JWTs carry the server-side role, and refresh reads the current role from the database.

- Anonymous requests to protected endpoints return **401** (authentication required).
- A signed-in User requesting `GET /api/admin/summary` receives **403** (insufficient permissions).
- An Admin receives aggregate user/training counts. The dashboard exposes the statistics button only for Admin accounts; the API enforces the permission independently.
- Both Users and Admins may read, update and delete only their own training records. Foreign record IDs return **404** to avoid exposing their existence.

Admin provisioning is an operator action, not a registration field. To promote a specific development account, execute a parameterized update to `Users.Role = 'Admin'` for that account in your SQL administration tool, then log in again. No account is promoted automatically. Existing access tokens keep their claims until expiry (up to 15 minutes); refreshing or signing in reads the latest database role.

The HTTP integration tests cover anonymous/User/Admin access, ownership enforcement for User and Admin, and attempted role escalation through registration.

## Validation and error responses (upgrade 3)

- New registrations require a valid email (up to 254 characters), a password of at least eight characters and at most 72 UTF-8 bytes, and gender `Male`, `Female` or `Other`. BCrypt's byte limit is validated before hashing. Login retains compatibility with existing shorter passwords and legacy account names.
- Workouts require a supported exercise and date; duration is 1�1440 minutes, calories 0�10000, intensity/fatigue 1�10 and notes at most 2000 characters. Missing dates and exercise values are rejected rather than silently defaulted.
- API validation returns `400 application/problem+json` with an `errors` dictionary keyed by field. Duplicate registrations return 409; invalid credentials return 401; inaccessible training IDs return 404. Unhandled errors use the global exception handler without exposing exception details.
- Angular registration, login, add and edit forms show API error messages and prevent repeated submission while a request is pending. Registration redirects to login with a success notice.
- No database migration is needed for this phase.

Example validation response (additional fields may be present):

```json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "DurationMinutes": ["The field DurationMinutes must be between 1 and 1440."] }
}
```

## Pagination, filtering and sorting (upgrade 4)

`GET /api/trainings` now returns an object instead of an array:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalCount": 0,
  "totalPages": 0
}
```

Query parameters:

| Parameter | Default | Values |
| --- | --- | --- |
| `page` | 1 | 1�1000000 |
| `pageSize` | 10 | 1�100 |
| `exerciseType` | all | Cardio, Strength, Flexibility |
| `from`, `to` | no limit | YYYY-MM-DD; both dates are inclusive |
| `sortBy` | trainingDate | trainingDate, durationMinutes, calories, intensity |
| `sortDirection` | desc | asc, desc |

Example: `/api/trainings?page=1&pageSize=10&exerciseType=Strength&from=2026-01-01&to=2026-01-31&sortBy=durationMinutes&sortDirection=desc`.

The API scopes the query to the signed-in user, filters and counts matching records, then sorts and applies SQL pagination. A unique ID secondary sort makes equal sort values deterministic. Pages beyond the last page return empty `items` with the actual count; no matches give `totalPages: 0`. Invalid query parameters return 400 ProblemDetails. Angular provides Apply/Reset filters, page-size selection, Previous/Next controls, loading/error states and recovery after deleting the last record on a page. Date filters compare stored training calendar dates without timezone conversion.

The list-response change is intentional; the Angular client and integration tests were updated together. No database migration is required. Pagination is covered by the backend integration suite.

## Automated tests and Swagger (upgrade 5)

Run backend tests from the repository root:

```powershell
dotnet test BE.Tests/BE.Tests.csproj
```

Run frontend tests and build from `FE/training-app-frontend`:

```powershell
npm run test:ci
npm run build
```

The frontend test command requires Chrome/Chromium installed (`CHROME_BIN` can point to a custom installation). It runs once in Chrome Headless. `npm test` runs in watch mode.

The suite contains 44 backend tests and 8 Angular tests. Backend tests use isolated SQLite databases and the real ASP.NET authentication/authorization middleware through WebApplicationFactory; they never modify the development SQL Server database. The suite covers JWT rejection, refresh cookies and rotation, logout, role updates, ownership, validation, pagination, monthly totals, deletion and the generated OpenAPI contract. SQLite is not a substitute for SQL Server deployment/migration checks. Angular HTTP tests verify token scoping, shared refresh, bounded retries, 403 handling and logout. They are not a complete end-to-end browser test of the application.

Swagger is at `https://localhost:7089/swagger` in Development. The raw OpenAPI document is `/swagger/v1/swagger.json`. It includes endpoint summaries, request examples, response schemas, validation errors and role requirements. Public authentication endpoints have no JWT security requirement; refresh/logout use the login cookie. Secured workout/Admin endpoints show the Bearer security requirement.

To try the API:

1. Register your own account using `POST /api/auth/register`. The example credentials are sample inputs, not a seeded account.
2. Execute `POST /api/auth/login` with those credentials.
3. Copy `token` and paste it into Swagger **Authorize**, without adding `Bearer`.
4. Try `GET /api/trainings` and create a workout. User accounts receive 403 on Admin statistics.
5. Execute refresh to rotate the browser cookie and get a new JWT. Swagger does not automatically replace the token in Authorize; paste the new token there when needed.
6. Logout revokes the refresh cookie; access JWTs already issued remain valid until expiry.

`BE/BE.http` contains matching request examples and an access-token placeholder for HTTP clients.
