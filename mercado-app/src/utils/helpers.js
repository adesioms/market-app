// Categorias pré-definidas para gastos
export const CATEGORIES = [
  { id: '1', name: 'Alimentos', icon: 'restaurant', color: '#4CAF50' },
  { id: '2', name: 'Bebidas', icon: 'local-drink', color: '#2196F3' },
  { id: '3', name: 'Limpeza', icon: 'cleaning-services', color: '#FF9800' },
  { id: '4', name: 'Higiene', icon: 'shower', color: '#E91E63' },
  { id: '5', name: 'Padaria', icon: 'bakery-dining', color: '#795548' },
  { id: '6', name: 'Açougue', icon: 'set-meal', color: '#F44336' },
  { id: '7', name: 'Hortifruti', icon: 'eco', color: '#8BC34A' },
  { id: '8', name: 'Outros', icon: 'shopping-bag', color: '#9E9E9E' },
];

// Formatar valor para moeda brasileira
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Formatar data para exibição
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

// Obter mês atual em formato YYYY-MM
export const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Calcular preço por unidade/metro/gramas para comparação
export const calculateUnitPrice = (price, quantity, unit) => {
  if (!quantity || quantity <= 0) return price;
  return price / quantity;
};

// Determinar melhor produto baseado em preço por unidade
export const findBestDeal = (products) => {
  if (!products || products.length === 0) return null;
  
  const validProducts = products.filter(p => p.price && p.quantity && p.quantity > 0);
  if (validProducts.length === 0) return null;
  
  let bestProduct = validProducts[0];
  let bestUnitPrice = bestProduct.price / bestProduct.quantity;
  
  for (let i = 1; i < validProducts.length; i++) {
    const unitPrice = validProducts[i].price / validProducts[i].quantity;
    if (unitPrice < bestUnitPrice) {
      bestUnitPrice = unitPrice;
      bestProduct = validProducts[i];
    }
  }
  
  return {
    product: bestProduct,
    unitPrice: bestUnitPrice,
  };
};
