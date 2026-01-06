import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:4000/api';
const ADMIN_EMAIL = 'admin@habanaluna.com';
const ADMIN_PASSWORD = 'admin123';

async function login(): Promise<string> {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  return response.data.accessToken;
}

async function deleteAllProducts(token: string) {
  console.log('🗑️  Eliminando productos existentes...\n');
  
  try {
    // Obtener todos los productos
    let page = 1;
    let hasMore = true;
    let deletedCount = 0;

    while (hasMore) {
      const response = await axios.get(`${API_URL}/products?page=${page}&limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const products = response.data.data || [];
      const meta = response.data.meta || {};

      if (products.length === 0) {
        hasMore = false;
        break;
      }

      // Eliminar cada producto
      for (const product of products) {
        try {
          await axios.delete(`${API_URL}/products/${product.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          deletedCount++;
          console.log(`   ✅ Eliminado: ${product.name}`);
        } catch (error: any) {
          console.error(`   ❌ Error al eliminar ${product.name}:`, error.response?.data?.message || error.message);
        }
      }

      // Verificar si hay más páginas
      if (page >= meta.totalPages) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log(`\n✅ Total de productos eliminados: ${deletedCount}\n`);
  } catch (error: any) {
    console.error('❌ Error al eliminar productos:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Iniciando limpieza y creación de productos...\n');

  try {
    // 1. Login
    console.log('🔐 Iniciando sesión...');
    const token = await login();
    console.log('✅ Login exitoso\n');

    // 2. Eliminar todos los productos
    await deleteAllProducts(token);

    // 3. Ejecutar el script de creación
    console.log('📦 Creando nuevos productos...\n');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    await execAsync(`API_URL=${API_URL} npm run create:products`, {
      cwd: process.cwd(),
      env: { ...process.env, API_URL },
    });

    console.log('\n✅ Proceso completado!');
  } catch (error: any) {
    console.error('\n❌ Error general:', error.message);
    process.exit(1);
  }
}

main();

