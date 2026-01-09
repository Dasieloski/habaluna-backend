# Configuración de Health Checks en Railway

Este documento explica cómo configurar los health checks en Railway para monitorear el estado del backend.

## Endpoints Disponibles

El módulo de health check proporciona tres endpoints:

### 1. `/api/health` - Health Check Completo
- **URL**: `GET /api/health`
- **Descripción**: Verifica el estado completo del servicio (DB, memoria, uptime)
- **Respuestas**:
  - `200 OK`: Servicio saludable
  - `503 Service Unavailable`: Problemas con la base de datos u otros componentes

### 2. `/api/health/ready` - Readiness Probe
- **URL**: `GET /api/health/ready`
- **Descripción**: Verifica si el servicio está listo para recibir tráfico (solo DB)
- **Uso**: Readiness probe en Railway/Kubernetes
- **Respuestas**:
  - `200 OK`: Servicio listo
  - `503 Service Unavailable`: Base de datos no disponible

### 3. `/api/health/live` - Liveness Probe
- **URL**: `GET /api/health/live`
- **Descripción**: Verifica si el servicio está vivo (sin verificar dependencias)
- **Uso**: Liveness probe en Railway/Kubernetes
- **Respuestas**:
  - `200 OK`: Servicio vivo

## Configuración en Railway

### Opción 1: Configuración desde el Dashboard de Railway

1. Ve a tu proyecto en [Railway Dashboard](https://railway.app)
2. Selecciona el servicio del backend
3. Ve a la pestaña **Settings**
4. En la sección **Healthcheck**, configura:
   - **Healthcheck Path**: `/api/health/ready`
   - **Healthcheck Timeout**: `10` segundos
   - **Healthcheck Interval**: `30` segundos

### Opción 2: Configuración mediante Railway CLI

Si prefieres usar la CLI, puedes crear un archivo `railway.json` en la raíz del backend:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/api/health/ready",
    "healthcheckTimeout": 10,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Opción 3: Variables de Entorno (si Railway las soporta)

Algunas plataformas permiten configurar health checks mediante variables de entorno. Railway detecta automáticamente los endpoints de health check, pero puedes verificar en la documentación más reciente.

## Recomendaciones

1. **Readiness Probe** (`/api/health/ready`): Úsalo para verificar que el servicio está listo antes de enviar tráfico. Railway esperará a que este endpoint responda `200` antes de considerar el servicio como "listo".

2. **Liveness Probe** (`/api/health/live`): Úsalo para verificar que el servicio está corriendo. Si este endpoint falla, Railway puede reiniciar el contenedor.

3. **Health Check Completo** (`/api/health`): Úsalo para monitoreo externo y alertas. Incluye información detallada sobre el estado del servicio.

## Monitoreo y Alertas

Puedes configurar alertas en Railway o usar herramientas externas como:
- **Uptime Robot**: Monitorea `/api/health` cada 5 minutos
- **Pingdom**: Configura checks HTTP para `/api/health`
- **Datadog/New Relic**: Integra con Railway para monitoreo avanzado

## Ejemplo de Respuesta del Health Check

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "uptimeFormatted": "1h 0m 0s",
  "memory": {
    "total": 8589934592,
    "free": 4294967296,
    "used": 4294967296,
    "percentage": 50.0
  },
  "database": {
    "status": "connected",
    "responseTime": 5
  },
  "version": "1.0.0"
}
```

## Troubleshooting

### El health check falla constantemente

1. Verifica que la base de datos esté accesible
2. Revisa los logs del servicio: `railway logs`
3. Verifica las variables de entorno de conexión a la DB
4. Asegúrate de que Prisma esté generado correctamente

### El servicio no inicia

1. Verifica que el puerto esté configurado correctamente (default: 4000)
2. Revisa que todas las dependencias estén instaladas
3. Verifica que las migraciones de Prisma se ejecuten correctamente

## Documentación Swagger

Los endpoints están documentados en Swagger y disponibles en:
- **URL**: `https://tu-dominio.com/api/docs`
- **Tag**: `health`
