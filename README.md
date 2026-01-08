# Habanaluna Backend API

Backend API desarrollado con NestJS para el ecommerce Habanaluna.

## Características

- **NestJS** - Framework Node.js escalable
- **PostgreSQL** - Base de datos relacional
- **Prisma ORM** - ORM moderno y type-safe
- **JWT Authentication** - Autenticación con refresh tokens
- **Swagger** - Documentación automática de la API
- **TypeScript** - Tipado estático

## Instalación

```bash
npm install
```

## Configuración

1. Copia el archivo `.env.example` a `.env`
2. Configura las variables de entorno necesarias

## Base de Datos

```bash
# Generar cliente Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# Poblar base de datos con datos iniciales
npm run prisma:seed
```

## Desarrollo

```bash
# Iniciar en modo desarrollo
npm run start:dev

# El servidor estará disponible en http://localhost:4000
# La documentación Swagger en http://localhost:4000/api/docs
```

## Endpoints Principales

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrarse
- `POST /api/auth/refresh` - Refrescar token
- `GET /api/products` - Listar productos
- `GET /api/products/:id` - Obtener producto
- `GET /api/categories` - Listar categorías
- `GET /api/cart` - Obtener carrito
- `POST /api/cart` - Añadir al carrito
- `POST /api/orders` - Crear pedido
- `GET /api/orders` - Listar pedidos del usuario
- `GET /api/stats/dashboard` - Estadísticas (Admin)

## Estructura

```
src/
├── auth/          # Módulo de autenticación
├── users/         # Módulo de usuarios
├── products/      # Módulo de productos
├── categories/    # Módulo de categorías
├── cart/          # Módulo de carrito
├── orders/        # Módulo de pedidos
├── stats/         # Módulo de estadísticas
├── banners/       # Módulo de banners
├── common/        # Utilidades comunes
└── prisma/        # Servicio Prisma
```

## Seguridad: Rate limiting (Auth)

Los endpoints de autenticación (`POST /api/auth/login` y `POST /api/auth/register`) tienen rate limiting con `@nestjs/throttler`.

Variables de entorno:

- **`THROTTLE_AUTH_LIMIT`**: límite de requests por ventana (por IP). Default: `5` en producción, `20` en desarrollo.
- **`THROTTLE_AUTH_TTL_SECONDS`**: tamaño de la ventana en segundos. Default: `900` (15 min) en producción, `60` en desarrollo.
- **`THROTTLE_ERROR_MESSAGE`**: mensaje para error **429**.
- **`TRUST_PROXY`**: si `true`, habilita `trust proxy` en Express (recomendado detrás de reverse proxy / Railway).
