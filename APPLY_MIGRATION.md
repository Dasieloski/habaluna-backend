# Aplicar Migración de averageRating

La migración `20260109154846_add_average_rating_to_product` necesita aplicarse en producción.

## Opción 1: Aplicar automáticamente (recomendado)

La migración se aplicará automáticamente cuando Railway despliegue el backend, ya que el script `start.sh` ejecuta `npx prisma migrate deploy`.

## Opción 2: Aplicar manualmente en Railway

1. Ve al dashboard de Railway
2. Selecciona el servicio del backend
3. Abre la terminal (Railway CLI o web terminal)
4. Ejecuta:
   ```bash
   npx prisma migrate deploy
   ```

## Opción 3: Aplicar usando Railway CLI localmente

```bash
cd backend
railway run npx prisma migrate deploy
```

## Verificar que se aplicó

Después de aplicar la migración, verifica que las columnas existen:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('averageRating', 'reviewCount');
```

Deberías ver ambas columnas listadas.
