FROM node:22-bookworm-slim AS frontend
WORKDIR /src/FE/training-app-frontend
COPY FE/training-app-frontend/package*.json ./
RUN npm ci
COPY FE/training-app-frontend/ ./
COPY scripts/Prepare-OfflineShell.mjs /src/scripts/Prepare-OfflineShell.mjs
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend
WORKDIR /src
COPY BE/BE.csproj BE/
RUN dotnet restore BE/BE.csproj
COPY BE/ BE/
COPY --from=frontend /src/FE/training-app-frontend/dist/training-app-frontend/browser/ BE/wwwroot/
RUN dotnet publish BE/BE.csproj -c Release --no-restore -o /app -p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=backend /app/ ./
ENV ASPNETCORE_HTTP_PORTS=8080
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "BE.dll"]
