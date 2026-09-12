# ETAPA 1: Construcción del frontend
FROM node:22-alpine AS frontend-build
WORKDIR /src

COPY ["indivizia-frontend/package.json", "indivizia-frontend/package-lock.json", "./"]
RUN npm ci

COPY indivizia-frontend/ .
RUN npm run build

# ETAPA 2: Construcción del backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["InDivizia.Api/InDivizia.Api.csproj", "InDivizia.Api/"]
COPY ["InDivizia.Application/InDivizia.Application.csproj", "InDivizia.Application/"]
COPY ["InDivizia.Domain/InDivizia.Domain.csproj", "InDivizia.Domain/"]

RUN dotnet restore "InDivizia.Api/InDivizia.Api.csproj"

COPY . .
COPY --from=frontend-build /src/dist /src/InDivizia.Api/wwwroot
WORKDIR "/src/InDivizia.Api"
RUN dotnet publish "InDivizia.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ETAPA 3: Ejecución
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "InDivizia.Api.dll"]