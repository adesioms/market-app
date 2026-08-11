import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PURCHASES = '@mercado_app_purchases';
const STORAGE_KEY_LIST = '@mercado_app_shopping_list';
const STORAGE_KEY_MASTER = '@mercado_app_master_list';

// === FUNÇÕES DE COMPRA (HISTÓRICO) ===
export const savePurchase = async (purchase) => {
  try {
    const existingData = await AsyncStorage.getItem(STORAGE_KEY_PURCHASES);
    const purchases = existingData ? JSON.parse(existingData) : [];
    
    const newPurchase = {
      ...purchase,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    purchases.push(newPurchase);
    await AsyncStorage.setItem(STORAGE_KEY_PURCHASES, JSON.stringify(purchases));
    return newPurchase;
  } catch (error) {
    console.error('Erro ao salvar compra:', error);
    throw error;
  }
};

export const getAllPurchases = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_PURCHASES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao buscar compras:', error);
    return [];
  }
};

export const getPurchasesByMonth = async (yearMonth) => {
  try {
    const purchases = await getAllPurchases();
    return purchases.filter(p => {
      const purchaseDate = new Date(p.date);
      const purchaseYearMonth = `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}`;
      return purchaseYearMonth === yearMonth;
    });
  } catch (error) {
    console.error('Erro ao filtrar compras por mês:', error);
    return [];
  }
};

export const getPurchasesByCategory = async (categoryId) => {
  try {
    const purchases = await getAllPurchases();
    return categoryId 
      ? purchases.filter(p => p.categoryId === categoryId)
      : purchases;
  } catch (error) {
    console.error('Erro ao filtrar compras por categoria:', error);
    return [];
  }
};

export const deletePurchase = async (id) => {
  try {
    const purchases = await getAllPurchases();
    const filtered = purchases.filter(p => p.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY_PURCHASES, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Erro ao deletar compra:', error);
    return false;
  }
};

export const getTotalSpent = async (yearMonth) => {
  try {
    const purchases = await getPurchasesByMonth(yearMonth);
    return purchases.reduce((total, p) => total + (parseFloat(p.price) || 0), 0);
  } catch (error) {
    console.error('Erro ao calcular total gasto:', error);
    return 0;
  }
};

export const getSpentByCategory = async (yearMonth) => {
  try {
    const purchases = await getPurchasesByMonth(yearMonth);
    const categoryTotals = {};
    
    purchases.forEach(p => {
      const categoryId = p.categoryId || '8';
      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = 0;
      }
      categoryTotals[categoryId] += parseFloat(p.price) || 0;
    });
    
    return categoryTotals;
  } catch (error) {
    console.error('Erro ao calcular gastos por categoria:', error);
    return {};
  }
};

// === FUNÇÕES DA LISTA DE COMPRAS ===
export const getShoppingList = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_LIST);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao buscar lista de compras:', error);
    return [];
  }
};

export const addToShoppingList = async (item) => {
  try {
    const list = await getShoppingList();
    const newItem = {
      ...item,
      id: Date.now().toString(),
      purchased: false,
      createdAt: new Date().toISOString(),
    };
    list.push(newItem);
    await AsyncStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(list));
    return newItem;
  } catch (error) {
    console.error('Erro ao adicionar à lista:', error);
    throw error;
  }
};

export const updateShoppingListItem = async (id, updates) => {
  try {
    const list = await getShoppingList();
    const updatedList = list.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    await AsyncStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(updatedList));
    return updatedList.find(i => i.id === id);
  } catch (error) {
    console.error('Erro ao atualizar item da lista:', error);
    throw error;
  }
};

export const removeFromShoppingList = async (id) => {
  try {
    const list = await getShoppingList();
    const filtered = list.filter(item => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Erro ao remover da lista:', error);
    return false;
  }
};

export const clearPurchasedItems = async () => {
  try {
    const list = await getShoppingList();
    const filtered = list.filter(item => !item.purchased);
    await AsyncStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Erro ao limpar itens comprados:', error);
    return false;
  }
};

// === FUNÇÕES DA LISTA MESTRA ===
export const getMasterList = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_MASTER);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao buscar lista mestra:', error);
    return [];
  }
};

export const addToMasterList = async (item) => {
  try {
    const masterList = await getMasterList();
    // Verifica se já existe produto com mesmo nome e marca
    const exists = masterList.some(
      i => i.name.toLowerCase() === item.name.toLowerCase() && 
           (i.brand || '').toLowerCase() === (item.brand || '').toLowerCase()
    );
    
    if (exists) {
      throw new Error('Produto já cadastrado na lista mestra');
    }
    
    const newItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    masterList.push(newItem);
    await AsyncStorage.setItem(STORAGE_KEY_MASTER, JSON.stringify(masterList));
    return newItem;
  } catch (error) {
    console.error('Erro ao adicionar à lista mestra:', error);
    throw error;
  }
};

export const removeFromMasterList = async (id) => {
  try {
    const masterList = await getMasterList();
    const filtered = masterList.filter(item => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY_MASTER, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Erro ao remover da lista mestra:', error);
    return false;
  }
};

export const getSuggestions = async (searchText) => {
  try {
    if (!searchText || searchText.length < 2) return [];
    
    const [masterList, purchases] = await Promise.all([
      getMasterList(),
      getAllPurchases()
    ]);
    
    const searchLower = searchText.toLowerCase();
    
    // Busca na lista mestra
    const masterSuggestions = masterList
      .filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        (item.brand && item.brand.toLowerCase().includes(searchLower))
      )
      .map(item => ({
        ...item,
        source: 'master',
        displayName: item.brand ? `${item.name} - ${item.brand}` : item.name
      }));
    
    // Busca no histórico de compras (últimas 50)
    const recentPurchases = purchases.slice(-50);
    const historySuggestions = recentPurchases
      .filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        (item.brand && item.brand.toLowerCase().includes(searchLower))
      )
      .map(item => ({
        ...item,
        source: 'history',
        displayName: item.brand ? `${item.name} - ${item.brand}` : item.name,
        lastPrice: item.price,
        lastQuantity: item.quantity,
        lastUnit: item.unit
      }));
    
    // Combina e remove duplicados
    const combined = [...masterSuggestions, ...historySuggestions];
    const unique = combined.filter((item, index, self) =>
      index === self.findIndex(t => 
        t.name === item.name && t.brand === item.brand
      )
    );
    
    return unique.slice(0, 10); // Retorna até 10 sugestões
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    return [];
  }
};
