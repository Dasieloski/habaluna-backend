import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:4000/api';
// Ruta relativa desde el script hasta la carpeta de imágenes (en la raíz del proyecto)
const IMAGES_DIR = path.join(__dirname, '../../IMAGENES COMIDA');
const ADMIN_EMAIL = 'admin@habanaluna.com';
const ADMIN_PASSWORD = 'admin123';

// Mapeo de imágenes a productos
const productMapping: Record<string, {
  name: string;
  description: string;
  shortDescription: string;
  categorySlug: string;
  sku?: string;
}> = {
  'aceite vibe.png': {
    name: 'Aceite de Oliva Virgen Extra',
    description: 'Aceite de oliva virgen extra de primera calidad, perfecto para tus mejores platos.',
    shortDescription: 'Aceite de oliva virgen extra premium',
    categorySlug: 'aceites-vinagres',
    sku: 'ACE-VIBE-001',
  },
  'ada aceite.png': {
    name: 'Aceite de Oliva Premium',
    description: 'Aceite de oliva premium seleccionado, ideal para uso gourmet.',
    shortDescription: 'Aceite de oliva premium',
    categorySlug: 'aceites-vinagres',
    sku: 'ACE-ADA-001',
  },
  'oilgroup.png': {
    name: 'Pack de Aceites Variados',
    description: 'Selección de aceites premium en pack especial.',
    shortDescription: 'Pack de aceites variados',
    categorySlug: 'aceites-vinagres',
    sku: 'ACE-PACK-001',
  },
  'spaghetti.png': {
    name: 'Spaghetti Premium',
    description: 'Spaghetti de sémola de trigo duro de la más alta calidad.',
    shortDescription: 'Spaghetti premium italiano',
    categorySlug: 'pastas-arroces',
    sku: 'PAS-SPA-001',
  },
  'spaguettiada.png': {
    name: 'Spaghetti Artesanal',
    description: 'Spaghetti artesanal elaborado tradicionalmente.',
    shortDescription: 'Spaghetti artesanal',
    categorySlug: 'pastas-arroces',
    sku: 'PAS-SPA-ART-001',
  },
  'penne.png': {
    name: 'Penne Premium',
    description: 'Penne de sémola de trigo duro, perfecto para salsas cremosas.',
    shortDescription: 'Penne premium italiano',
    categorySlug: 'pastas-arroces',
    sku: 'PAS-PEN-001',
  },
  'penneada.png': {
    name: 'Penne Artesanal',
    description: 'Penne artesanal de calidad superior.',
    shortDescription: 'Penne artesanal',
    categorySlug: 'pastas-arroces',
    sku: 'PAS-PEN-ART-001',
  },
  'elbow (1).png': {
    name: 'Coditos Premium',
    description: 'Coditos de pasta de la más alta calidad.',
    shortDescription: 'Coditos premium',
    categorySlug: 'pastas-arroces',
    sku: 'PAS-ELB-001',
  },
  'elbowada.png': {
    name: 'Coditos Artesanal',
    description: 'Coditos artesanales elaborados tradicionalmente.',
    shortDescription: 'Coditos artesanal',
    categorySlug: 'pastas-arroces',
    sku: 'PAS-ELB-ART-001',
  },
  'elbowsvibe.png': {
    name: 'Coditos Vibe',
    description: 'Coditos premium con diseño especial.',
    shortDescription: 'Coditos vibe premium',
    categorySlug: 'pastas-arroces',
    sku: 'PAS-ELB-VIBE-001',
  },
  'pasta tomate.png': {
    name: 'Pasta con Tomate',
    description: 'Pasta artesanal con tomate natural, lista para disfrutar.',
    shortDescription: 'Pasta con tomate natural',
    categorySlug: 'pastas-arroces',
    sku: 'PAS-TOM-001',
  },
  'harina.png': {
    name: 'Harina Premium',
    description: 'Harina de trigo de la más alta calidad para tus mejores recetas.',
    shortDescription: 'Harina premium',
    categorySlug: 'pastas-arroces',
    sku: 'HAR-PRE-001',
  },
  'harinagroup.png': {
    name: 'Pack de Harinas',
    description: 'Selección de harinas premium en pack especial.',
    shortDescription: 'Pack de harinas variadas',
    categorySlug: 'pastas-arroces',
    sku: 'HAR-PACK-001',
  },
  'tomato.png': {
    name: 'Tomate Natural Premium',
    description: 'Tomate natural de la más alta calidad.',
    shortDescription: 'Tomate natural premium',
    categorySlug: 'conservas',
    sku: 'CON-TOM-001',
  },
  'vozca.png': {
    name: 'Vodka Premium',
    description: 'Vodka premium de la más alta calidad.',
    shortDescription: 'Vodka premium',
    categorySlug: 'dulces-postres',
    sku: 'BEV-VOD-001',
  },
  'whisky.png': {
    name: 'Whisky Premium',
    description: 'Whisky seleccionado de calidad superior.',
    shortDescription: 'Whisky premium',
    categorySlug: 'dulces-postres',
    sku: 'BEV-WHI-001',
  },
  'hupman.png': {
    name: 'Producto Premium Hupman',
    description: 'Producto premium de la marca Hupman.',
    shortDescription: 'Producto Hupman premium',
    categorySlug: 'conservas',
    sku: 'HUP-001',
  },
  'cemento.jpg': {
    name: 'Producto Especial',
    description: 'Producto especial de calidad premium.',
    shortDescription: 'Producto especial',
    categorySlug: 'conservas',
    sku: 'ESP-001',
  },
  'po.webp': {
    name: 'Producto Premium',
    description: 'Producto premium de la más alta calidad.',
    shortDescription: 'Producto premium',
    categorySlug: 'conservas',
    sku: 'PRE-001',
  },
};

// Función para generar slug desde el nombre
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Función para hacer login y obtener token
async function login(): Promise<string> {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    return response.data.accessToken;
  } catch (error: any) {
    console.error('Error al hacer login:', error.response?.data || error.message);
    throw error;
  }
}

// Función para subir imagen
async function uploadImage(filePath: string, token: string): Promise<string> {
  try {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const response = await axios.post(`${API_URL}/upload/single`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.url;
  } catch (error: any) {
    console.error(`Error al subir imagen ${filePath}:`, error.response?.data || error.message);
    throw error;
  }
}

// Función para obtener categoría por slug usando la API
async function getCategoryBySlug(slug: string, token: string) {
  try {
    // Primero intentar obtener de la API
    const response = await axios.get(`${API_URL}/categories`);
    const categories = response.data;
    const category = categories.find((cat: any) => cat.slug === slug);
    
    if (category) {
      return category;
    }
    
    // Si no existe, crear usando la API
    console.log(`   ⚠️  Categoría ${slug} no encontrada, creándola...`);
    const categoryNames: Record<string, { name: string; description: string; order: number }> = {
      'aceites-vinagres': {
        name: 'Aceites y Vinagres',
        description: 'Aceites de oliva premium y vinagres artesanales',
        order: 1,
      },
      'conservas': {
        name: 'Conservas',
        description: 'Conservas gourmet de la más alta calidad',
        order: 2,
      },
      'especias-condimentos': {
        name: 'Especias y Condimentos',
        description: 'Especias exóticas y condimentos únicos',
        order: 3,
      },
      'miel-mermeladas': {
        name: 'Miel y Mermeladas',
        description: 'Miel artesanal y mermeladas premium',
        order: 4,
      },
      'pastas-arroces': {
        name: 'Pastas y Arroces',
        description: 'Pastas artesanales y arroces selectos',
        order: 5,
      },
      'dulces-postres': {
        name: 'Dulces y Postres',
        description: 'Dulces artesanales y postres gourmet',
        order: 6,
      },
    };
    
    const catData = categoryNames[slug];
    if (!catData) {
      throw new Error(`Categoría desconocida: ${slug}`);
    }
    
    const createResponse = await axios.post(
      `${API_URL}/categories`,
      {
        name: catData.name,
        slug: slug,
        description: catData.description,
        isActive: true,
        order: catData.order,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    console.log(`   ✅ Categoría creada: ${catData.name}`);
    return createResponse.data;
  } catch (error: any) {
    console.error(`   ❌ Error al obtener/crear categoría ${slug}:`, error.response?.data || error.message);
    throw error;
  }
}

// Función para crear producto
async function createProduct(
  productData: {
    name: string;
    description: string;
    shortDescription: string;
    categorySlug: string;
    sku?: string;
    images: string[];
  },
  token: string
) {
  let productPayload: any;
  try {
    const category = await getCategoryBySlug(productData.categorySlug, token);
    const slug = generateSlug(productData.name);

    // Verificar si el producto ya existe y eliminarlo para recrearlo
    try {
      const existingResponse = await axios.get(`${API_URL}/products/slug/${slug}`);
      if (existingResponse.data) {
        console.log(`   ⚠️  Producto ya existe, eliminando para recrear...`);
        try {
          await axios.delete(`${API_URL}/products/${existingResponse.data.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          console.log(`   ✅ Producto eliminado, creando nuevo...`);
        } catch (deleteError: any) {
          console.error(`   ❌ Error al eliminar:`, deleteError.response?.data?.message || deleteError.message);
          // Continuar de todas formas
        }
      }
    } catch (error: any) {
      // Si no existe (404), continuar
      if (error.response?.status !== 404) {
        throw error;
      }
    }

    productPayload = {
      name: productData.name,
      slug,
      description: productData.description,
      categoryId: category.id,
      stock: 0, // Sin stock en modo catálogo
      isActive: true,
      isFeatured: false,
      images: productData.images || [],
      allergens: [],
    };

    // Campos opcionales
    if (productData.shortDescription) {
      productPayload.shortDescription = productData.shortDescription;
    }
    if (productData.sku) {
      productPayload.sku = productData.sku;
    }

    const response = await axios.post(
      `${API_URL}/products`,
      productPayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Producto creado: ${productData.name}`);
    return response.data;
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    console.error(`Error al crear producto ${productData.name}:`, JSON.stringify(errorDetails, null, 2));
    if (error.response?.status === 500 && productPayload) {
      console.error(`   Payload enviado:`, JSON.stringify(productPayload, null, 2));
    }
    throw error;
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando creación de productos desde imágenes...\n');

  try {
    // 1. Hacer login
    console.log('🔐 Iniciando sesión...');
    const token = await login();
    console.log('✅ Login exitoso\n');

    // 2. Leer archivos de imágenes
    console.log('📁 Leyendo imágenes...');
    if (!fs.existsSync(IMAGES_DIR)) {
      throw new Error(`Directorio de imágenes no encontrado: ${IMAGES_DIR}`);
    }

    const files = fs.readdirSync(IMAGES_DIR).filter(
      (file) => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')
    );
    console.log(`✅ Encontradas ${files.length} imágenes\n`);

    // 3. Procesar cada imagen
    for (const file of files) {
      const filePath = path.join(IMAGES_DIR, file);
      const productInfo = productMapping[file];

      if (!productInfo) {
        console.log(`⚠️  No hay mapeo para: ${file}, saltando...`);
        continue;
      }

      try {
        console.log(`\n📦 Procesando: ${file}`);
        console.log(`   Producto: ${productInfo.name}`);

        // Subir imagen
        console.log('   📤 Subiendo imagen...');
        const imageUrl = await uploadImage(filePath, token);
        console.log(`   ✅ Imagen subida: ${imageUrl}`);

        // Crear producto
        console.log('   🛍️  Creando producto...');
        await createProduct(
          {
            ...productInfo,
            images: [imageUrl],
          },
          token
        );

        console.log(`   ✅ Completado: ${productInfo.name}`);
      } catch (error: any) {
        console.error(`   ❌ Error procesando ${file}:`, error.message);
        continue;
      }
    }

    console.log('\n✅ Proceso completado!');
  } catch (error: any) {
    console.error('\n❌ Error general:', error.message);
    process.exit(1);
  }
}

main();

