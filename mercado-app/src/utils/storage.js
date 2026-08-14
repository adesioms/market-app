import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SHOPPING_LIST: '@mercado:shoppingList',
  MASTER_LIST: '@mercado:masterList',
  PURCHASE_HISTORY: '@mercado:purchaseHistory'
};

export const CATEGORIES = [
  { id: 'hortifruti', name: 'Hortifruti', icon: 'leaf', color: '#43A047' },
  { id: 'despensa', name: 'Despensa e Mercearia', icon: 'basket-outline', color: '#8D6E63' },
  { id: 'laticinios_ovos', name: 'Laticínios e Ovos', icon: 'egg-outline', color: '#FB8C00' },
  { id: 'proteinas', name: 'Proteínas', icon: 'food-drumstick-outline', color: '#E53935' },
  { id: 'padaria_cafe', name: 'Padaria e Café', icon: 'coffee-outline', color: '#F9A825' },
  { id: 'bebidas', name: 'Bebidas', icon: 'bottle-soda-outline', color: '#1E88E5' },
  { id: 'snacks_doces', name: 'Snacks, Doces e Conveniência', icon: 'popcorn', color: '#8E24AA' },
  { id: 'congelados', name: 'Congelados e Prontos', icon: 'snowflake', color: '#5E35B1' },
  { id: 'limpeza', name: 'Limpeza', icon: 'spray-bottle', color: '#00ACC1' },
  { id: 'higiene_cuidados', name: 'Higiene e Cuidados', icon: 'human', color: '#D81B60' },
  { id: 'casa_pet', name: 'Casa e Pet', icon: 'home-outline', color: '#00897B' },
  { id: 'outros', name: 'Outros', icon: 'shape-outline', color: '#757575' }
];

const LEGACY_CATEGORY_MAP = {
  carnes: 'proteinas',
  laticinios: 'laticinios_ovos',
  frios: 'proteinas',
  padaria: 'padaria_cafe',
  mercearia: 'despensa',
  higiene: 'higiene_cuidados',
  bebe: 'higiene_cuidados',
  pet: 'casa_pet',
  casa: 'casa_pet'
};

const normalizeCategoryId = (categoryId) => {
  const migratedCategory = LEGACY_CATEGORY_MAP[categoryId] || categoryId;
  return CATEGORIES.some(category => category.id === migratedCategory) ? migratedCategory : 'outros';
};

const normalizeItemCategory = (item) => ({
  ...item,
  category: normalizeCategoryId(item.category)
});

export const UNITS = ['un', 'dz', 'kg', 'g', 'L', 'mL', 'm', 'cx', 'pacote'];

const CATEGORY_PURCHASE_DEFAULTS = {
  hortifruti: { quantity: '1', unit: 'kg' },
  proteinas: { quantity: '1', unit: 'kg' },
  laticinios_ovos: { quantity: '1', unit: 'un' }
};

export const getPurchaseDefaults = (categoryId) => {
  const category = normalizeCategoryId(categoryId);
  return CATEGORY_PURCHASE_DEFAULTS[category] || { quantity: '1', unit: 'un' };
};

// Lista Mestra
export const getMasterList = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.MASTER_LIST);
    return data ? JSON.parse(data).map(normalizeItemCategory) : [];
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
    const newItem = { ...item, category: normalizeCategoryId(item.category), id: Date.now().toString() };
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

export const updateMasterListItem = async (id, updates) => {
  try {
    const current = await getMasterList();
    const updated = current.map(item =>
      item.id === id
        ? { ...item, ...updates, category: normalizeCategoryId(updates.category ?? item.category) }
        : item
    );
    await saveMasterList(updated);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar a lista mestra:', error);
    return false;
  }
};

// Lista de Compras
export const getShoppingList = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
    return data ? JSON.parse(data).map(normalizeItemCategory) : [];
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
    const category = normalizeCategoryId(item.category);
    const defaults = getPurchaseDefaults(category);
    const newItem = {
      ...item,
      category,
      id: Date.now().toString(),
      status: 'pending', // pending, purchased
      purchaseDate: null,
      price: null,
      quantity: item.quantity ?? defaults.quantity,
      unit: item.unit ?? defaults.unit,
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
      item.id === id
        ? { ...item, ...updates, category: normalizeCategoryId(updates.category ?? item.category) }
        : item
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
    return data ? JSON.parse(data).map(normalizeItemCategory) : [];
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
    const newItem = { ...item, category: normalizeCategoryId(item.category), id: Date.now().toString() };
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
