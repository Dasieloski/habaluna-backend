import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUiSettingsDto } from './dto/update-ui-settings.dto';

@Injectable()
export class UiSettingsService {
  constructor(private prisma: PrismaService) {}

  private defaults() {
    return {
      headerAnnouncement: 'Envíos a toda la Habana - Entrega rápida',
      headerHighlights: [
        'Envío gratis +50€',
        '30 días devolución',
        'Pago seguro',
        '4.8/5 valoración',
      ],
      benefits: [
        {
          title: 'VARIEDAD',
          description:
            'Encuentra desde alimentos hasta materiales de construcción, todo en un solo lugar.',
        },
        {
          title: 'DEVOLUCIONES GRATIS',
          description: 'Tienes 30 días para devolver tu producto sin costo adicional.',
        },
        {
          title: 'ENTREGA RÁPIDA',
          description: 'Tu pedido sale en menos de 24h y llega en tiempo récord.',
        },
      ],
    };
  }

  private async getOrCreate() {
    const existing = await this.prisma.uiSettings.findFirst();
    if (existing) return existing;
    const d = this.defaults();
    return this.prisma.uiSettings.create({
      data: {
        headerAnnouncement: d.headerAnnouncement,
        headerHighlights: d.headerHighlights as any,
        benefits: d.benefits as any,
      },
    });
  }

  async getPublic() {
    return this.getOrCreate();
  }

  async getAdmin() {
    return this.getOrCreate();
  }

  async updateAdmin(dto: UpdateUiSettingsDto) {
    const current = await this.getOrCreate();
    return this.prisma.uiSettings.update({
      where: { id: current.id },
      data: {
        ...(dto.headerAnnouncement !== undefined
          ? { headerAnnouncement: dto.headerAnnouncement }
          : {}),
        ...(dto.headerHighlights !== undefined
          ? { headerHighlights: dto.headerHighlights as any }
          : {}),
        ...(dto.benefits !== undefined ? { benefits: dto.benefits as any } : {}),
      },
    });
  }
}
