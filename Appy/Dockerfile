# Dockerfile

# --- Build the Angular frontend ---
FROM --platform=$BUILDPLATFORM node:18 AS frontend-build
WORKDIR /app/Appy-frontend
COPY Appy-frontend/package.json Appy-frontend/package-lock.json ./
RUN npm ci
COPY Appy-frontend/ ./
RUN npm run build

# --- Build the .NET backend (does not build the frontend) ---
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . .
RUN dotnet publish -c Release -o out

# --- Runtime image ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
RUN apt-get update -yq \
    && apt-get install curl -yq

COPY --from=backend-build /app/out .
# Serve the pre-built frontend from the path the backend expects (spaPath in Program.cs)
COPY --from=frontend-build /app/Appy-frontend/build ./Appy-frontend/build

ENTRYPOINT ["dotnet", "Appy.dll"]

HEALTHCHECK --interval=10s --timeout=10s --start-period=30s --retries=2 CMD curl --fail http://localhost:80/health || exit 1
