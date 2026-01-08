import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateUiSettingsDto } from './dto/update-ui-settings.dto';
import { UiSettingsService } from './ui-settings.service';

@ApiTags('ui-settings')
@Controller('ui-settings')
export class UiSettingsController {
  constructor(private readonly ui: UiSettingsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Get UI settings (public)' })
  async getPublic() {
    return this.ui.getPublic();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get UI settings (Admin only)' })
  async getAdmin() {
    return this.ui.getAdmin();
  }

  @Patch('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update UI settings (Admin only)' })
  async updateAdmin(@Body() dto: UpdateUiSettingsDto) {
    return this.ui.updateAdmin(dto);
  }
}
