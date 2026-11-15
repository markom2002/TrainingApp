# API operations and tradeoffs

## Health and diagnostics

- `GET /health/live`: process liveness, no database dependency.
- `GET /health/ready`: database connectivity, HTTP 200 when healthy and 503 when unavailable. The response exposes only status, never a connection string or exception details. Connectivity checks have a five-second cancellation budget; they do not prove every migration has been applied.
- API responses include a server-generated `X-Request-ID`. Structured request logs record method, path, status, elapsed milliseconds and trace ID. Request bodies, query strings, tokens, cookies and passwords are not included by this middleware.

For machine-readable container logs, set `Logging__Console__FormatterName=json`. Use the trace ID to connect a failed response to server logs. Keep log storage access-restricted.

## Authentication rate limits

Registration, sign-in and demo creation share a fixed window of **10 requests per minute per client IP**, with no queue. Rejections return 429 ProblemDetails and `Retry-After`. Refresh and ordinary workout operations do not consume this budget. Configure `Security__AuthRequestsPerMinute` for your deployment.

Limits are in-memory per API instance. Multiple replicas need a shared edge limit; users behind a shared NAT also share an IP budget. Configure trusted forwarded headers at the reverse proxy so traffic is not all attributed to one proxy address. The Compose API has no published port and only Caddy is exposed.

## Persistence

Workout operations use EF Core async queries/writes and propagate request cancellation. The SQL unique index on `(UserId, ClientId)` resolves concurrent offline retries. A losing insert discards its tracked changes and reads the winning record, including original exercise units. An unrelated database write error is rethrown when no matching saved record exists.

The API remains a modular monolith with controllers, DTO validation, scoped services and EF persistence. This project does not require microservices or a message broker. SQLite tests provide fast feedback; SQL Server tests cover provider-specific migrations, decimal storage and concurrency.
