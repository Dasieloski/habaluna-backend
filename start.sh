#!/bin/sh
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL no está configurada. Configúrala en Railway (Variables) o añade un plugin de PostgreSQL."
  exit 1
fi

echo "🔧 Generando Prisma Client..."
npx prisma generate

echo "🔄 Sincronizando schema de Prisma con la base de datos..."
# En producción preferimos migraciones; si no hay migraciones, usamos db push.
npx prisma migrate deploy || npx prisma db push || echo "⚠️  Advertencia: Error al sincronizar base de datos (puede ser normal si ya está sincronizada)"

if [ "${RUN_SEED:-}" = "true" ] || [ "${RUN_SEED:-}" = "1" ]; then
  echo "🌱 Ejecutando seed (RUN_SEED=${RUN_SEED})..."
  npx prisma db seed || echo "⚠️  Seed falló (continuando)."
else
  echo "ℹ️  Seed omitido (set RUN_SEED=true para ejecutar)."
fi

echo "🚀 Iniciando servidor..."
exec npm run start:prod

