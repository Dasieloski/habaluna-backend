import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST') || 'localhost';
        const redisPort = configService.get<number>('REDIS_PORT') || 6379;
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const enableRedis = configService.get<string>('ENABLE_REDIS')?.toLowerCase() === 'true';

        // Si Redis no está habilitado, usar cache en memoria
        if (!enableRedis) {
          return {
            ttl: 300, // 5 minutos por defecto
            max: 100, // Máximo 100 items en cache
          };
        }

        return {
          store: redisStore,
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          ttl: 300, // 5 minutos por defecto
          max: 1000, // Máximo 1000 items en cache
        };
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
