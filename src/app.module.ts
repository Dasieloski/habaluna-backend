import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
//import { CsrfGuard } from './common/guards/csrf.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { StatsModule } from './stats/stats.module';
import { BannersModule } from './banners/banners.module';
import { UploadModule } from './upload/upload.module';
import { OffersModule } from './offers/offers.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { UiSettingsModule } from './ui-settings/ui-settings.module';
import { LoggerModule } from './common/logger/logger.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    LoggerModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';

        const authLimitDefault = isProd ? 5 : 20;
        const authTtlSecondsDefault = isProd ? 15 * 60 : 60;

        const authLimit = Number(config.get<string>('THROTTLE_AUTH_LIMIT') ?? authLimitDefault);
        const authTtlSeconds = Number(
          config.get<string>('THROTTLE_AUTH_TTL_SECONDS') ?? authTtlSecondsDefault,
        );

        // Configuración de rate limiting
        const globalLimitDefault = isProd ? 100 : 1000;
        const globalTtlSecondsDefault = 60; // 1 minuto

        const globalLimit = Number(
          config.get<string>('THROTTLE_GLOBAL_LIMIT') ?? globalLimitDefault,
        );
        const globalTtlSeconds = Number(
          config.get<string>('THROTTLE_GLOBAL_TTL_SECONDS') ?? globalTtlSecondsDefault,
        );

        return {
          throttlers: [
            {
              name: 'auth',
              ttl: authTtlSeconds,
              limit: authLimit,
            },
            {
              name: 'default',
              ttl: globalTtlSeconds,
              limit: globalLimit,
            },
          ],
          // Mensaje claro para 429
          errorMessage:
            config.get<string>('THROTTLE_ERROR_MESSAGE') ??
            'Has excedido el límite de intentos. Por favor espera antes de reintentar.',
        };
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    StatsModule,
    BannersModule,
    UploadModule,
    OffersModule,
    ReviewsModule,
    WishlistModule,
    UiSettingsModule,
    HealthModule,
  ],
  providers: [
    HttpExceptionFilter,
    // Aplicar rate limiting globalmente a todos los endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
