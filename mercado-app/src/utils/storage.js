import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SHOPPING_LIST: '@mercado:shoppingList',
  MASTER_LIST: '@mercado:masterList',
  PURCHASE_HISTORY: '@mercado:purchaseHistory'
};

export const CATEGORIES = [
  { id: 'hortifruti', name: 'Hortifruti', icon: 'leaf', color: '#4CAF50' },
  { id: 'carnes', name: 'Carnes', icon: 'restaurant', color: '#F44336' },
  { id: 'laticinios', name: 'Laticínios', icon: 'cube', color: '#FF9800' },
  { id: 'padaria', name: 'Padaria', icon: 'pizza', color: '#FFC107' },
  { id: 'bebidas', name: 'Bebidas', icon: 'wine', color: '#2196F3' },
  { id: 'limpeza', name: 'Limpeza', icon: 'water', color: '#00BCD4' },
  { id: 'higiene', name: 'Higiene', icon: 'body', color: '#E91E63' },
  { id: 'outros', name: 'Outros', icon: 'grid', color: '#9E9E9E' }
];

export const UNITS = ['un', 'kg', 'g', 'L', 'mL', 'm', 'cx', 'pacote'];

// Lista Mestra
export const getMasterList = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.MASTER_LIST);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao buscar lista mestra:', error);
    return [];
  }
};

export const saveMasterList = async (items) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MASTER_LIST, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error('Erro ao salvar lista mestra:', error);
    return false;
  }
};

export const addToMasterList = async (item) => {
  try {
    const current = await getMasterList();
    const newItem = { ...item, id: Date.now().toString() };
    await saveMasterList([...current, newItem]);
    return newItem;
  } catch (error) {
    console.error('Erro ao adicionar à lista mestra:', error);
    return null;
  }
};

export const removeFromMasterList = async (id) => {
  try {
    const current = await getMasterList();
    const updated = current.filter(item => item.id !== id);
    await saveMasterList(updated);
    return true;
  } catch (error) {
    console.error('Erro ao remover da lista mestra:', error);
    return false;
  }
};

// Lista de Compras
export const getShoppingList = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao buscar lista de compras:', error);
    return [];
  }
};

export const saveShoppingList = async (items) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error('Erro ao salvar lista de compras:', error);
    return false;
  }
};

export const addToShoppingList = async (item) => {
  try {
    const current = await getShoppingList();
    const newItem = { 
      ...item, 
      id: Date.now().toString(),
      status: 'pending', // pending, purchased
      purchaseDate: null,
      price: null,
      quantity: 1,
      unit: 'un',
      isPromotion: false,
      originalPrice: null
    };
    await saveShoppingList([...current, newItem]);
    return newItem;
  } catch (error) {
    console.error('Erro ao adicionar à lista de compras:', error);
    return null;
  }
};

export const updateShoppingItem = async (id, updates) => {
  try {
    const current = await getShoppingList();
    const updated = current.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    await saveShoppingList(updated);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    return false;
  }
};

export const removeFromShoppingList = async (id) => {
  try {
    const current = await getShoppingList();
    const updated = current.filter(item => item.id !== id);
    await saveShoppingList(updated);
    return true;
  } catch (error) {
    console.error('Erro ao remover da lista de compras:', error);
    return false;
  }
};

export const markAsPurchased = async (id, purchaseData) => {
  try {
    const current = await getShoppingList();
    const purchaseDate = new Date().toISOString();
    const updated = current.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: 'purchased',
          purchaseDate,
          ...purchaseData
        };
      }
      return item;
    });
    await saveShoppingList(updated);
    
    // Adicionar ao histórico
    const purchasedItem = updated.find(item => item.id === id);
    if (purchasedItem) {
      await addToPurchaseHistory({
        ...purchasedItem,
        purchaseDate,
        ...purchaseData
      });
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao marcar como comprado:', error);
    return false;
  }
};

// Histórico de Compras
export const getPurchaseHistory = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASE_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return [];
  }
};

export const savePurchaseHistory = async (items) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PURCHASE_HISTORY, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error('Erro ao salvar histórico:', error);
    return false;
  }
};

export const addToPurchaseHistory = async (item) => {
  try {
    const current = await getPurchaseHistory();
    const newItem = { ...item, id: Date.now().toString() };
    await savePurchaseHistory([newItem, ...current]);
    return newItem;
  } catch (error) {
    console.error('Erro ao adicionar ao histórico:', error);
    return null;
  }
};

export const removeFromPurchaseHistory = async (id) => {
  try {
    const current = await getPurchaseHistory();
    const updated = current.filter(item => item.id !== id);
    await savePurchaseHistory(updated);
    return true;
  } catch (error) {
    console.error('Erro ao remover do histórico:', error);
    return false;
  }
};

// Buscar sugestões (Lista Mestra + Histórico)
export const searchSuggestions = async (query) => {
  if (!query || query.length < 2) return [];
  
  try {
    const masterList = await getMasterList();
    const history = await getPurchaseHistory();
    
    const queryLower = query.toLowerCase();
    
    // Buscar na lista mestra
    const masterMatches = masterList.filter(item => 
      item.name.toLowerCase().includes(queryLower) ||
      (item.brand && item.brand.toLowerCase().includes(queryLower))
    );
    
    // Buscar no histórico (produtos únicos)
    const historyProducts = {};
    history.forEach(item => {
      const key = `${item.name}-${item.brand || ''}`;
      if (!historyProducts[key]) {
        historyProducts[key] = {
          name: item.name,
          brand: item.brand,
          category: item.category,
          lastPrice: item.price,
          source: 'history'
        };
      }
    });
    
    const historyMatches = Object.values(historyProducts).filter(item =>
      item.name.toLowerCase().includes(queryLower) ||
      (item.brand && item.brand.toLowerCase().includes(queryLower))
    );
    
    // Combinar resultados, priorizando lista mestra
    const combined = [...masterMatches.map(m => ({...m, source: 'master'})), ...historyMatches];
    
    // Remover duplicatas
    const unique = combined.filter((item, index, self) =>
      index === self.findIndex(i => i.name === item.name && i.brand === item.brand)
    );
    
    return unique.slice(0, 10);
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    return [];
  }
};

// Estatísticas para Dashboard
export const getDashboardStats = async () => {
  try {
    const history = await getPurchaseHistory();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthPurchases = history.filter(item => {
      const purchaseDate = new Date(item.purchaseDate);
      return purchaseDate.getMonth() === currentMonth && 
             purchaseDate.getFullYear() === currentYear;
    });
    
    const totalSpent = monthPurchases.reduce((sum, item) => {
      return sum + (item.price * item.quantity || 0);
    }, 0);
    
    const categoryTotals = {};
    CATEGORIES.forEach(cat => {
      categoryTotals[cat.id] = 0;
    });
    
    monthPurchases.forEach(item => {
      if (categoryTotals[item.category] !== undefined) {
        categoryTotals[item.category] += (item.price * item.quantity || 0);
      }
    });
    
    const categoryData = CATEGORIES
      .filter(cat => categoryTotals[cat.id] > 0)
      .map(cat => ({
        name: cat.name,
        value: categoryTotals[cat.id],
        color: cat.color
      }));
    
    return {
      totalSpent,
      categoryData,
      totalItems: monthPurchases.length,
      promotionCount: monthPurchases.filter(item => item.isPromotion).length
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return { totalSpent: 0, categoryData: [], totalItems: 0, promotionCount: 0 };
  }
};
