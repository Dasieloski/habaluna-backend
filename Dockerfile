FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias (incluyendo dev para build)
RUN npm install

COPY . .

RUN npm run build
RUN npx prisma generate

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

# Copiar scripts de inicio
COPY start.sh start-dev.sh ./
RUN chmod +x start.sh start-dev.sh

CMD ["./start.sh"]

