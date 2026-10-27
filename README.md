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
- Authentication establishes identity. Authorization controls permitted actions; role-based authorization is planned for upgrade 2.
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
