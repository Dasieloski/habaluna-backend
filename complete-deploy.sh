#!/bin/bash

# Script completo de despliegue en Railway
# Este script intenta automatizar todo el proceso

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Despliegue de Habanaluna en Railway                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI no está instalado${NC}"
    echo -e "${YELLOW}Instálalo con: npm i -g @railway/cli${NC}"
    exit 1
fi

# Verificar autenticación
echo -e "${BLUE}📋 Paso 1: Verificando autenticación...${NC}"
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  No estás autenticado${NC}"
    echo -e "${YELLOW}Por favor ejecuta: railway login${NC}"
    echo -e "${YELLOW}Luego ejecuta este script nuevamente${NC}"
    exit 1
fi

USER=$(railway whoami 2>/dev/null | head -n1 || echo "Usuario")
echo -e "${GREEN}✅ Autenticado como: ${USER}${NC}\n"

# Verificar/Crear proyecto
echo -e "${BLUE}📦 Paso 2: Configurando proyecto...${NC}"
if [ ! -f "$PROJECT_DIR/.railway/project.toml" ]; then
    echo -e "${YELLOW}No hay proyecto vinculado. Vinculando...${NC}"
    railway link
else
    echo -e "${GREEN}✅ Proyecto ya vinculado${NC}"
fi

# Crear servicio PostgreSQL
echo -e "\n${BLUE}🗄️  Paso 3: Configurando base de datos PostgreSQL...${NC}"
echo -e "${YELLOW}Por favor crea un servicio PostgreSQL desde el dashboard:${NC}"
echo -e "${YELLOW}1. Ve a https://railway.app${NC}"
echo -e "${YELLOW}2. Selecciona tu proyecto${NC}"
echo -e "${YELLOW}3. Click en 'New' → 'Database' → 'Add PostgreSQL'${NC}"
echo -e "${YELLOW}4. Railway creará automáticamente DATABASE_URL${NC}"
read -p "Presiona Enter cuando hayas creado la base de datos..."

# Configurar Backend
echo -e "\n${BLUE}🔧 Paso 4: Configurando Backend...${NC}"
cd "$BACKEND_DIR"

if [ ! -f ".railway/service.toml" ]; then
    echo -e "${YELLOW}Vinculando servicio backend...${NC}"
    railway link
else
    echo -e "${GREEN}✅ Backend ya vinculado${NC}"
fi

echo -e "\n${YELLOW}📝 Configura estas variables en Railway Dashboard (Backend Service → Variables):${NC}"
echo -e "${YELLOW}"
echo "DATABASE_URL=\${{Postgres.DATABASE_URL}}"
echo "JWT_SECRET=[genera uno con el comando abajo]"
echo "JWT_REFRESH_SECRET=[genera otro diferente]"
echo "JWT_EXPIRATION=15m"
echo "JWT_REFRESH_EXPIRATION=7d"
echo "NODE_ENV=production"
echo "FRONTEND_URL=https://habanluna.com"
echo "PORT=4000"
echo -e "${NC}"

echo -e "${BLUE}Generando secretos JWT...${NC}"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)
JWT_REFRESH=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)

echo -e "${GREEN}JWT_SECRET sugerido: ${JWT_SECRET}${NC}"
echo -e "${GREEN}JWT_REFRESH_SECRET sugerido: ${JWT_REFRESH}${NC}"

read -p "Presiona Enter cuando hayas configurado las variables del backend..."

# Configurar Frontend
echo -e "\n${BLUE}🎨 Paso 5: Configurando Frontend...${NC}"
cd "$FRONTEND_DIR"

if [ ! -f ".railway/service.toml" ]; then
    echo -e "${YELLOW}Vinculando servicio frontend...${NC}"
    railway link
else
    echo -e "${GREEN}✅ Frontend ya vinculado${NC}"
fi

echo -e "\n${YELLOW}📝 Configura esta variable en Railway Dashboard (Frontend Service → Variables):${NC}"
echo -e "${YELLOW}NEXT_PUBLIC_API_URL=https://tu-backend.railway.app/api${NC}"
echo -e "${YELLOW}(Actualiza esto después de obtener la URL del backend)${NC}"
read -p "Presiona Enter cuando hayas configurado la variable del frontend..."

# Desplegar
echo -e "\n${BLUE}🚀 Paso 6: Desplegando servicios...${NC}"

echo -e "${YELLOW}Desplegando backend...${NC}"
cd "$BACKEND_DIR"
railway up --detach || echo -e "${YELLOW}⚠️  Error al desplegar backend. Intenta desde el dashboard.${NC}"

echo -e "${YELLOW}Desplegando frontend...${NC}"
cd "$FRONTEND_DIR"
railway up --detach || echo -e "${YELLOW}⚠️  Error al desplegar frontend. Intenta desde el dashboard.${NC}"

# Resumen
echo -e "\n${GREEN}✅ Configuración completada!${NC}\n"
echo -e "${BLUE}📋 Próximos pasos:${NC}"
echo -e "1. ${YELLOW}Espera a que los servicios se desplieguen${NC}"
echo -e "2. ${YELLOW}Obtén las URLs de tus servicios desde el dashboard${NC}"
echo -e "3. ${YELLOW}Actualiza NEXT_PUBLIC_API_URL con la URL del backend${NC}"
echo -e "4. ${YELLOW}Configura los dominios personalizados:${NC}"
echo -e "   - Frontend: habanluna.com y www.habanluna.com"
echo -e "   - Backend: api.habanluna.com"
echo -e "5. ${YELLOW}Configura los CNAME en GoDaddy${NC}"
echo -e "6. ${YELLOW}Actualiza las variables de entorno con las URLs finales${NC}"
echo -e "\n${BLUE}📚 Para más detalles:${NC}"
echo -e "   - DEPLOY_INSTRUCTIONS.md"
echo -e "   - QUICK_DEPLOY.md"
echo -e "\n${GREEN}¡Buena suerte con el despliegue! 🚀${NC}"

