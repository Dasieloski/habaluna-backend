import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private decimalToNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    // Prisma Decimal has toNumber()
    const maybe: any = value as any;
    if (typeof maybe?.toNumber === 'function') return maybe.toNumber();
    if (typeof maybe?.toString === 'function') return Number(maybe.toString());
    return Number(value as any);
  }

  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: createUserDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findCustomers(params?: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params?.limit || 50)));
    const search = (params?.search || '').trim();

    const where: any = {
      role: 'USER',
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
          isActive: true,
        },
      }),
    ]);

    const userIds = users.map((u) => u.id);

    const orderAggs = userIds.length
      ? await this.prisma.order.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds } },
          _count: { _all: true },
          _sum: { total: true },
          _max: { createdAt: true },
        })
      : [];

    const aggByUserId = new Map(
      orderAggs.map((a) => [
        a.userId,
        {
          totalOrders: a._count?._all ?? 0,
          totalSpent: this.decimalToNumber(a._sum?.total),
          lastOrderAt: a._max?.createdAt ? new Date(a._max.createdAt).toISOString() : null,
        },
      ]),
    );

    return {
      data: users.map((u) => {
        const agg = aggByUserId.get(u.id) || { totalOrders: 0, totalSpent: 0, lastOrderAt: null };
        return {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
          createdAt: u.createdAt,
          isActive: u.isActive,
          totalOrders: agg.totalOrders,
          totalSpent: agg.totalSpent,
          lastOrderAt: agg.lastOrderAt,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        zipCode: true,
        country: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        zipCode: true,
        country: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
