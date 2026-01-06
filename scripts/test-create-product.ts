import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:4000/api';
const ADMIN_EMAIL = 'admin@habanaluna.com';
const ADMIN_PASSWORD = 'admin123';

async function testCreateProduct() {
  try {
    // 1. Login
    console.log('🔐 Iniciando sesión...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    const token = loginResponse.data.accessToken;
    console.log('✅ Login exitoso\n');

    // 2. Obtener categorías
    console.log('📂 Obteniendo categorías...');
    const categoriesResponse = await axios.get(`${API_URL}/categories`);
    const categories = categoriesResponse.data;
    console.log(`✅ Encontradas ${categories.length} categorías`);
    
    if (categories.length === 0) {
      console.error('❌ No hay categorías disponibles');
      return;
    }

    const firstCategory = categories[0];
    console.log(`   Usando categoría: ${firstCategory.name} (${firstCategory.id})\n`);

    // 3. Intentar crear un producto simple
    console.log('🛍️  Creando producto de prueba...');
    const productData = {
      name: 'Producto de Prueba',
      slug: 'producto-de-prueba-test',
      description: 'Este es un producto de prueba para verificar que la creación funciona correctamente.',
      shortDescription: 'Producto de prueba',
      categoryId: firstCategory.id,
      stock: 0,
      isActive: true,
      isFeatured: false,
      images: [],
      allergens: [],
    };

    console.log('📦 Datos del producto:', JSON.stringify(productData, null, 2));

    const response = await axios.post(
      `${API_URL}/products`,
      productData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n✅ Producto creado exitosamente!');
    console.log('📦 Producto:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('\n❌ Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    if (error.response?.data) {
      console.error('\n📋 Detalles del error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCreateProduct();

