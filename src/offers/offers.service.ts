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
}

