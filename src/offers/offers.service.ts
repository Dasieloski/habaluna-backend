import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { ListOffersDto } from './dto/list-offers.dto';

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  private normalizeCode(code: string) {
    return (code || '').trim().toUpperCase();
  }

  async findAllAdmin(query: ListOffersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = (query.search || '').trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.offer.count({ where }),
      this.prisma.offer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneAdmin(id: string) {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  async create(dto: CreateOfferDto) {
    const code = this.normalizeCode(dto.code);
    if (!code) throw new BadRequestException('Code is required');

    return this.prisma.offer.create({
      data: {
        name: dto.name,
        code,
        type: dto.type as any,
        value: dto.value as any,
        minPurchase: dto.minPurchase as any,
        usageLimit: dto.usageLimit,
        usageCount: dto.usageCount ?? 0,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateOfferDto) {
    await this.findOneAdmin(id);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.code !== undefined) data.code = this.normalizeCode(dto.code);
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.minPurchase !== undefined) data.minPurchase = dto.minPurchase;
    if (dto.usageLimit !== undefined) data.usageLimit = dto.usageLimit;
    if (dto.usageCount !== undefined) data.usageCount = dto.usageCount;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.offer.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOneAdmin(id);
    return this.prisma.offer.delete({ where: { id } });
  }

  /**
   * Validar y aplicar un cupón/offer
   * Retorna el descuento calculado y la información de la oferta
   */
  async validateOffer(code: string, subtotal: number): Promise<{
    valid: boolean;
    discount: number;
    offer?: any;
    message?: string;
  }> {
    const offer = await this.prisma.offer.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!offer) {
      return {
        valid: false,
        discount: 0,
        message: 'Cupón no encontrado',
      };
    }

    // Validar que esté activo
    if (!offer.isActive) {
      return {
        valid: false,
        discount: 0,
        message: 'Este cupón no está activo',
      };
    }

    // Validar fechas
    const now = new Date();
    if (now < offer.startDate) {
      return {
        valid: false,
        discount: 0,
        message: 'Este cupón aún no está disponible',
      };
    }

    if (now > offer.endDate) {
      return {
        valid: false,
        discount: 0,
        message: 'Este cupón ha expirado',
      };
    }

    // Validar compra mínima
    if (offer.minPurchase && subtotal < Number(offer.minPurchase)) {
      return {
        valid: false,
        discount: 0,
        message: `El cupón requiere una compra mínima de $${Number(offer.minPurchase).toFixed(2)}`,
      };
    }

    // Validar límite de uso
    if (offer.usageLimit && offer.usageCount >= offer.usageLimit) {
      return {
        valid: false,
        discount: 0,
        message: 'Este cupón ha alcanzado su límite de uso',
      };
    }

    // Calcular descuento
    let discount = 0;
    if (offer.type === 'PERCENTAGE') {
      discount = (subtotal * Number(offer.value)) / 100;
    } else if (offer.type === 'FIXED') {
      discount = Number(offer.value);
      // El descuento no puede ser mayor que el subtotal
      if (discount > subtotal) {
        discount = subtotal;
      }
    }

    return {
      valid: true,
      discount,
      offer: {
        id: offer.id,
        name: offer.name,
        code: offer.code,
        type: offer.type,
        value: offer.value,
      },
    };
  }

  /**
   * Incrementar el contador de uso de un cupón
   * Se llama cuando un cupón se aplica exitosamente en una orden
   */
  async incrementUsageCount(offerId: string): Promise<void> {
    await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  }
}
