# ETAPA 1: Construcción (Build)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["InDivizia.Api/InDivizia.Api.csproj", "InDivizia.Api/"]
COPY ["InDivizia.Application/InDivizia.Application.csproj", "InDivizia.Application/"]
COPY ["InDivizia.Domain/InDivizia.Domain.csproj", "InDivizia.Domain/"]

RUN dotnet restore "InDivizia.Api/InDivizia.Api.csproj"

COPY . .
WORKDIR "/src/InDivizia.Api"
RUN dotnet publish "InDivizia.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ETAPA 2: Ejecución (Runtime)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "InDivizia.Api.dll"]