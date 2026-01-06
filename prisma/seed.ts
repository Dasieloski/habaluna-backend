import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Crear usuario admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@habanaluna.com' },
    update: {},
    create: {
      email: 'admin@habanaluna.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'Habanaluna',
      role: 'ADMIN',
    },
  });

  // Crear usuario de prueba
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@habanaluna.com' },
    update: {},
    create: {
      email: 'user@habanaluna.com',
      password: userPassword,
      firstName: 'Usuario',
      lastName: 'Prueba',
      role: 'USER',
    },
  });

  // Crear categorías
  const categories = [
    {
      name: 'Aceites y Vinagres',
      slug: 'aceites-vinagres',
      description: 'Aceites de oliva premium y vinagres artesanales',
      order: 1,
    },
    {
      name: 'Conservas',
      slug: 'conservas',
      description: 'Conservas gourmet de la más alta calidad',
      order: 2,
    },
    {
      name: 'Especias y Condimentos',
      slug: 'especias-condimentos',
      description: 'Especias exóticas y condimentos únicos',
      order: 3,
    },
    {
      name: 'Miel y Mermeladas',
      slug: 'miel-mermeladas',
      description: 'Miel artesanal y mermeladas premium',
      order: 4,
    },
    {
      name: 'Pastas y Arroces',
      slug: 'pastas-arroces',
      description: 'Pastas artesanales y arroces selectos',
      order: 5,
    },
    {
      name: 'Dulces y Postres',
      slug: 'dulces-postres',
      description: 'Dulces artesanales y postres gourmet',
      order: 6,
    },
  ];

  const createdCategories = [];
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
    createdCategories.push(created);
  }

  // Crear productos
  const products = [
    {
      name: 'Aceite de Oliva Virgen Extra Premium',
      slug: 'aceite-oliva-virgen-extra-premium',
      description: 'Aceite de oliva virgen extra de primera prensada en frío. Procedente de olivos centenarios de la región mediterránea. Sabor intenso y afrutado, perfecto para ensaladas y platos gourmet.',
      shortDescription: 'Aceite de oliva virgen extra de primera prensada en frío',
      priceUSD: 24.99,
      comparePriceUSD: 29.99,
      sku: 'ACE-001',
      stock: 50,
      isActive: true,
      isFeatured: true,
      images: ['/products/aceite-oliva-1.jpg', '/products/aceite-oliva-2.jpg'],
      allergens: [],
      categoryId: createdCategories[0].id,
      weight: 0.5,
    },
    {
      name: 'Vinagre Balsámico de Módena IGP',
      slug: 'vinagre-balsamico-modena-igp',
      description: 'Vinagre balsámico tradicional de Módena con Indicación Geográfica Protegida. Envejecido en barricas de roble durante 12 años. Sabor dulce y complejo.',
      shortDescription: 'Vinagre balsámico tradicional envejecido 12 años',
      priceUSD: 18.50,
      comparePriceUSD: 22.00,
      sku: 'VIN-001',
      stock: 30,
      isActive: true,
      isFeatured: true,
      images: ['/products/vinagre-balsamico-1.jpg'],
      allergens: [],
      categoryId: createdCategories[0].id,
      weight: 0.25,
    },
    {
      name: 'Anchoas del Cantábrico en Aceite',
      slug: 'anchoas-cantabrico-aceite',
      description: 'Anchoas del Cantábrico seleccionadas a mano y conservadas en aceite de oliva virgen extra. Sabor intenso y textura delicada.',
      shortDescription: 'Anchoas del Cantábrico en aceite de oliva',
      priceUSD: 15.99,
      comparePriceUSD: 19.99,
      sku: 'CON-001',
      stock: 40,
      isActive: true,
      isFeatured: false,
      images: ['/products/anchoas-1.jpg'],
      allergens: ['Pescado'],
      categoryId: createdCategories[1].id,
      weight: 0.1,
    },
    {
      name: 'Pimientos del Piquillo Asados',
      slug: 'pimientos-piquillo-asados',
      description: 'Pimientos del piquillo asados a la leña y pelados a mano. Tradición navarra en cada bocado.',
      shortDescription: 'Pimientos del piquillo asados a la leña',
      priceUSD: 8.99,
      comparePriceUSD: 11.99,
      sku: 'CON-002',
      stock: 60,
      isActive: true,
      isFeatured: false,
      images: ['/products/pimientos-1.jpg'],
      allergens: [],
      categoryId: createdCategories[1].id,
      weight: 0.35,
    },
    {
      name: 'Azafrán en Hebras Premium',
      slug: 'azafran-hebras-premium',
      description: 'Azafrán en hebras de la más alta calidad. Procedente de La Mancha, el mejor azafrán del mundo.',
      shortDescription: 'Azafrán en hebras de La Mancha',
      priceUSD: 45.00,
      comparePriceUSD: 55.00,
      sku: 'ESP-001',
      stock: 25,
      isActive: true,
      isFeatured: true,
      images: ['/products/azafran-1.jpg'],
      allergens: [],
      categoryId: createdCategories[2].id,
      weight: 0.001,
    },
    {
      name: 'Miel de Lavanda Artesanal',
      slug: 'miel-lavanda-artesanal',
      description: 'Miel de lavanda pura y artesanal. Recolectada en los campos de Provenza. Sabor floral y delicado.',
      shortDescription: 'Miel de lavanda pura y artesanal',
      priceUSD: 12.99,
      comparePriceUSD: 15.99,
      sku: 'MIE-001',
      stock: 35,
      isActive: true,
      isFeatured: false,
      images: ['/products/miel-lavanda-1.jpg'],
      allergens: [],
      categoryId: createdCategories[3].id,
      weight: 0.5,
    },
    {
      name: 'Mermelada de Fresa Premium',
      slug: 'mermelada-fresa-premium',
      description: 'Mermelada artesanal de fresas seleccionadas. Sin conservantes ni colorantes. 70% fruta.',
      shortDescription: 'Mermelada artesanal de fresas, 70% fruta',
      priceUSD: 7.99,
      comparePriceUSD: 9.99,
      sku: 'MER-001',
      stock: 45,
      isActive: true,
      isFeatured: false,
      images: ['/products/mermelada-fresa-1.jpg'],
      allergens: [],
      categoryId: createdCategories[3].id,
      weight: 0.34,
    },
    {
      name: 'Pasta Artesanal Tagliatelle',
      slug: 'pasta-artesanal-tagliatelle',
      description: 'Pasta artesanal italiana de sémola de trigo duro. Elaborada tradicionalmente con agua de manantial.',
      shortDescription: 'Pasta artesanal italiana de sémola de trigo duro',
      priceUSD: 6.50,
      comparePriceUSD: 8.50,
      sku: 'PAS-001',
      stock: 50,
      isActive: true,
      isFeatured: false,
      images: ['/products/pasta-tagliatelle-1.jpg'],
      allergens: ['Gluten'],
      categoryId: createdCategories[4].id,
      weight: 0.5,
    },
    {
      name: 'Arroz Bomba de Calasparra',
      slug: 'arroz-bomba-calasparra',
      description: 'Arroz bomba D.O. Calasparra. El mejor arroz para paella, absorbe perfectamente los sabores.',
      shortDescription: 'Arroz bomba D.O. Calasparra para paella',
      priceUSD: 9.99,
      comparePriceUSD: 12.99,
      sku: 'ARR-001',
      stock: 40,
      isActive: true,
      isFeatured: true,
      images: ['/products/arroz-bomba-1.jpg'],
      allergens: [],
      categoryId: createdCategories[4].id,
      weight: 1.0,
    },
    {
      name: 'Turrón Artesanal de Jijona',
      slug: 'turron-artesanal-jijona',
      description: 'Turrón blando de Jijona elaborado artesanalmente. Receta tradicional con almendras seleccionadas.',
      shortDescription: 'Turrón blando artesanal de Jijona',
      priceUSD: 16.99,
      comparePriceUSD: 21.99,
      sku: 'DUL-001',
      stock: 30,
      isActive: true,
      isFeatured: true,
      images: ['/products/turron-jijona-1.jpg'],
      allergens: ['Frutos secos', 'Huevo'],
      categoryId: createdCategories[5].id,
      weight: 0.5,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }

  // Crear banners
  const banners = [
    {
      title: 'Nueva Colección Premium',
      description: 'Descubre nuestros productos gourmet seleccionados',
      image: '/banners/banner-1.jpg',
      link: '/products?featured=true',
      isActive: true,
      order: 1,
    },
    {
      title: 'Envío Gratis',
      description: 'En pedidos superiores a 50€',
      image: '/banners/banner-2.jpg',
      link: '/products',
      isActive: true,
      order: 2,
    },
  ];

  // Delete existing banners and create new ones
  await prisma.banner.deleteMany({});
  await prisma.banner.createMany({
    data: banners,
  });

  console.log('✅ Seeding completed!');
  console.log(`👤 Admin: admin@habanaluna.com / admin123`);
  console.log(`👤 User: user@habanaluna.com / user123`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

