# Frontend de InDivízia

## Desarrollo local

Inicia el backend en el puerto `5059`:

```bash
dotnet run --project InDivizia.Api --launch-profile http
```

En otra terminal, inicia Vite:

```bash
cd indivizia-frontend
npm install
npm run dev
```

El navegador llama a `/api`. Vite reenvía esas solicitudes al backend, por lo
que también funciona al abrir el frontend desde otro dispositivo de la red.

Si el backend usa otra dirección, crea un archivo `.env.local`:

```env
VITE_API_PROXY_TARGET=http://192.168.1.20:5059
```

`VITE_API_URL` permite reemplazar por completo la URL usada por el navegador,
pero normalmente no hace falta:

```env
VITE_API_URL=https://api.ejemplo.com/api/split
```

## Producción

El Dockerfile construye Vite y copia `dist/` a `InDivizia.Api/wwwroot`. El
frontend y `/api` se sirven desde el mismo origen. HTTPS debe terminarse en el
servicio de despliegue o proxy que esté delante del contenedor.
