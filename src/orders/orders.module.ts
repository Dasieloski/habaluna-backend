import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CartModule } from '../cart/cart.module';
import { EmailService } from '../common/email/email.service';
import { OffersModule } from '../offers/offers.module';

@Module({
  imports: [CartModule, OffersModule],
  controllers: [OrdersController],
  providers: [OrdersService, EmailService],
})
export class OrdersModule {}
