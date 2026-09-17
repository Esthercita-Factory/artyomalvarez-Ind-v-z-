# InDivízia

App para dividir gastos grupales (la vaca) y calcular quién le transfiere a quién, con el mínimo de pagos.

## Estructura

Todos los proyectos viven en `src/`:

```
src/
  InDivizia.Domain/              Entidades (gasto, cuota, transferencia)
  InDivizia.Application/         Lógica para calcular la división
  InDivizia.Application.Tests/   Pruebas del cálculo
  InDivizia.Api/                 API ASP.NET (`POST /api/split`)
  indivizia-frontend/            Interfaz Vite (HTML, JS y CSS)
```

La solución `InDivizia.slnx` está en la raíz.

## Requisitos

- .NET 10 SDK
- Node.js 22 (solo para el frontend en desarrollo)

## Desarrollo local

Backend en el puerto `5059`:

```bash
dotnet run --project src/InDivizia.Api --launch-profile http
```

Frontend (en otra terminal):

```bash
cd src/indivizia-frontend
npm install
npm run dev
```

El navegador usa `/api`. Vite reenvía esas solicitudes al backend.

Si el API está en otra dirección, creá `src/indivizia-frontend/.env.local`:

```env
VITE_API_PROXY_TARGET=http://192.168.1.20:5059
```

## Tests

```bash
dotnet test InDivizia.slnx
```

## Docker

El contenedor construye el frontend, lo copia a `wwwroot` y sirve API + interfaz en el puerto `8080`:

```bash
docker build -t indivizia .
docker run --rm -p 8080:8080 indivizia
```
