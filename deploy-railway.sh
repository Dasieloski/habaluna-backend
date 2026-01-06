#!/bin/bash

# Script de despliegue en Railway para Habanaluna
# Uso: ./deploy-railway.sh

set -e

echo "🚀 Iniciando despliegue en Railway..."

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que Railway CLI está instalado
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI no está instalado. Instálalo con:"
    echo "   npm i -g @railway/cli"
    exit 1
fi

echo -e "${BLUE}📦 Verificando autenticación en Railway...${NC}"
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  No estás autenticado. Ejecuta: railway login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Autenticado en Railway${NC}"

# Directorio base del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo ""
echo -e "${BLUE}📦 Desplegando Backend...${NC}"
cd "$BACKEND_DIR"

# Verificar si está vinculado
if [ ! -f ".railway/service.toml" ]; then
    echo -e "${YELLOW}⚠️  El backend no está vinculado a un servicio de Railway${NC}"
    echo -e "${YELLOW}   Ejecuta: cd backend && railway link${NC}"
else
    echo -e "${GREEN}✅ Backend vinculado${NC}"
    echo "Desplegando backend..."
    railway up --detach
fi

echo ""
echo -e "${BLUE}📦 Desplegando Frontend...${NC}"
cd "$FRONTEND_DIR"

# Verificar si está vinculado
if [ ! -f ".railway/service.toml" ]; then
    echo -e "${YELLOW}⚠️  El frontend no está vinculado a un servicio de Railway${NC}"
    echo -e "${YELLOW}   Ejecuta: cd frontend && railway link${NC}"
else
    echo -e "${GREEN}✅ Frontend vinculado${NC}"
    echo "Desplegando frontend..."
    railway up --detach
fi

echo ""
echo -e "${GREEN}✅ Despliegue completado!${NC}"
echo ""
echo "📝 Próximos pasos:"
echo "1. Verifica las variables de entorno en el dashboard de Railway"
echo "2. Ejecuta las migraciones de Prisma: railway run npx prisma migrate deploy"
echo "3. Configura los dominios personalizados en Railway y GoDaddy"
echo ""
echo "🌐 Dashboard: https://railway.app"

