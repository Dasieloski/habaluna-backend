module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/prisma/**',
  ],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    // Cobertura mínima del 70% para servicios críticos
    './auth/auth.service.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './orders/orders.service.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './products/products.service.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './cart/cart.service.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

