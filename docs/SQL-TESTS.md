# SQL Server integration tests

The fast test suite continues to use isolated in-memory SQLite databases. The additional SQL Server suite validates the real provider, all checked-in migrations, the filtered unique retry index, decimal weight values, concurrent requests and account isolation.

## Local SQL Server

```powershell
$env:TRAINING_TEST_SQL='Server=localhost\SQLEXPRESS;Integrated Security=True;Encrypt=True;TrustServerCertificate=True'
dotnet test BE.Tests/BE.Tests.csproj -c Release --filter FullyQualifiedName~SqlServerTests
Remove-Item Env:TRAINING_TEST_SQL
```

Use your own SQL Server instance name. The login needs permission to create and drop databases. The fixture ignores the database named in the supplied connection string: it generates a `TrainingTests_<guid>` database, checks that exact name before migrations and cleanup, and removes only that database. It never migrates or clears your personal training database. Do not supply a production server.

Without `TRAINING_TEST_SQL`, these tests report **Skipped**, rather than silently passing. The dedicated GitHub Actions workflow always supplies a disposable SQL Server 2022 container and runs the SQL-specific tests. CI retains TRX reports.

The concurrent retry scenario starts four HTTP requests for one account and client ID. Every response must return the same saved ID and history must contain exactly one record. A separate test discards the first confirmed write's response and retries, checking that original lbs values survive. This models a lost confirmation; it does not claim to simulate a network packet failure.
