// Tasa de cambio: 1 USD = X MNs
// Esta tasa puede ser configurable en el futuro
const MNS_TO_USD_RATE = 245; // 1 USD = 245 MNs

export function convertToUSD(price: number, currency: 'USD' | 'MNs'): number {
  if (currency === 'USD') {
    return price;
  }
  // Convertir MNs a USD
  return price / MNS_TO_USD_RATE;
}

export function formatCurrency(price: number, currency: 'USD' | 'MNs'): string {
  if (currency === 'MNs') {
    return new Intl.NumberFormat('es-ES', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price) + ' MNs';
  }
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

