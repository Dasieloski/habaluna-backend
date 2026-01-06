FROM node:18-bullseye-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Prisma engines requieren OpenSSL/CA certs en runtime/build.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Instalar todas las dependencias (incluyendo dev para build)
RUN npm install

COPY . .

RUN npm run build
RUN npx prisma generate

FROM node:18-bullseye-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

# Copiar scripts de inicio
COPY start.sh start-dev.sh ./
RUN chmod +x start.sh start-dev.sh

CMD ["./start.sh"]

