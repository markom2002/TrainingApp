# Free interactive GitHub Pages demo

Public address: **https://markom2002.github.io/TrainingApp/**

Select **Explore browser demo**. No Azure subscription, payment card, password or running laptop is required. The frontend runs on GitHub Pages; it does not execute ASP.NET Core or connect to SQL Server.

## Available interactions

- Dashboard and calendar with twelve synthetic workouts dated relative to the first demo session.
- The shared 48-exercise catalog, movement guides and 3D athlete asset.
- Create, repeat, edit and delete workouts, including independent kg/lbs values and individual sets.
- Edit the sample profile, goals and weigh-ins; recompute local progress and achievements.
- Reload to resume the sample session. Use **Reset demo** to restore sample data.

Records stay in this browser's local storage. They are not sent to a server, shared between visitors or synchronized to the personal phone app. Clearing browser data removes them. Storage quota failures show an error rather than reporting a successful save. This is a portfolio demonstration; use synthetic information.

The page has a persistent disclosure that there is no live server. The ASP.NET Core API, database migrations, concurrency behavior and authentication security are demonstrated separately by the repository's tests and container environment. The browser demo's unsigned marker is not a real authentication token and is never accepted or sent to the real API.

## Build and preview

```powershell
cd FE/training-app-frontend
npm ci
npm run build:pages
# Serve dist/pages-demo/browser at the URL prefix /TrainingApp/.
```

The `pages` Angular configuration uses a separate environment replacement and output directory. A demo HTTP interceptor answers supported API calls locally and rejects unsupported API paths; there is no network fallback. Ordinary production/development builds keep demo mode disabled and retain the real API.

The pages build uses hash navigation (`/TrainingApp/#/dashboard`) so refreshing a route works on static hosting. The packaging script scopes images, icons, models, the manifest and shell worker to `/TrainingApp/`. Cached assets can support offline revisits after the shell finishes preparing; clearing browser storage or an incomplete initial download prevents that.

The exercise catalog is generated from `BE/Exercises/ExerciseCatalog.cs`. After changing it, run:

```powershell
node scripts/Generate-DemoCatalog.mjs
```

`build:pages` checks for catalog drift. Unit tests verify local persistence, exact weight values, retries, reset, aggregation and separation from the normal API.

## Publishing

The **Publish interactive demo** workflow builds and tests the demo, uploads only `dist/pages-demo/browser`, and deploys to GitHub Pages. The repository's **Settings > Pages > Source** must be **GitHub Actions**. Deployment uses the standard `github-pages` environment and its protection rules. Updates to frontend source or Pages packaging trigger a new deployment from `master`.

No connection strings, real records, certificates, passwords or backend configuration are included in the Pages artifact. The public source link remains available in the demo banner.
