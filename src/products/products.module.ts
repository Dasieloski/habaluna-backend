import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductVariantsService } from './product-variants.service';
import { ProductVariantsController } from './product-variants.controller';
import { SearchModule } from '../search/search.module';
import { ProductsSchedulerService } from './products-scheduler.service';
import { EmailService } from '../common/email/email.service';
import { CacheModule } from '../common/cache/cache.module';

@Module({
  imports: [SearchModule, CacheModule],
  controllers: [ProductsController, ProductVariantsController],
  providers: [ProductsService, ProductVariantsService, ProductsSchedulerService, EmailService],
  exports: [ProductsService, ProductVariantsService],
})
export class ProductsModule {}
