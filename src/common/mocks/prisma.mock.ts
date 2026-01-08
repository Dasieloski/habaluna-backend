import { PrismaService } from '../../prisma/prisma.service';

// Helper para crear mocks de métodos de Prisma que retornan Promises
const createPrismaMock = () => {
  const mock = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    upsert: jest.fn(),
  };
  return mock as any;
};

export const createMockPrismaService = (): any => {
  return {
    user: createPrismaMock(),
    product: createPrismaMock(),
    productVariant: createPrismaMock(),
    cartItem: createPrismaMock(),
    order: createPrismaMock(),
    orderItem: createPrismaMock(),
    refreshToken: createPrismaMock(),
    passwordResetToken: createPrismaMock(),
    category: createPrismaMock(),
    comboItem: createPrismaMock(),
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $on: jest.fn(),
    $use: jest.fn(),
    $extends: jest.fn(),
  };
};
