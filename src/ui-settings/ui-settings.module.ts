import { Module } from '@nestjs/common';
import { UiSettingsController } from './ui-settings.controller';
import { UiSettingsService } from './ui-settings.service';

@Module({
  controllers: [UiSettingsController],
  providers: [UiSettingsService],
})
export class UiSettingsModule {}
