# Dockerfile

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:6.0 AS build-env
WORKDIR /app
RUN apt-get update -yq \
    && apt-get install curl gnupg -yq \
    && curl -sL https://deb.nodesource.com/setup_16.x | bash \
    && apt-get install nodejs -yq

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . .
RUN dotnet publish -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:6.0
WORKDIR /app
RUN apt-get update -yq \
    && apt-get install curl -yq

COPY --from=build-env /app/out .
ENTRYPOINT ["dotnet", "Appy.dll"]

HEALTHCHECK --interval=10s --timeout=10s --start-period=30s --retries=2 CMD curl --fail http://localhost:80/health || exit 1