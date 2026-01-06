#!/bin/sh
set -e

echo "🔧 Generando Prisma Client..."
npx prisma generate

echo "🔄 Sincronizando schema de Prisma con la base de datos..."
# Intenta db push primero (sincroniza schema directamente)
# Si falla, intenta migrate deploy (para migraciones existentes)
npx prisma db push --accept-data-loss || npx prisma migrate deploy || echo "⚠️  Advertencia: Error al sincronizar base de datos (puede ser normal si ya está sincronizada)"

echo "🚀 Iniciando servidor..."
exec npm run start:prod

