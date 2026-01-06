#!/bin/sh
set -e

echo "🔧 Generando Prisma Client..."
npx prisma generate

echo "🚀 Iniciando servidor en modo desarrollo..."
exec npm run start:dev

