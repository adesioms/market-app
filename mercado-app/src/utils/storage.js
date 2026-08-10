import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@mercado_app_purchases';

export const savePurchase = async (purchase) => {
  try {
    const existingData = await AsyncStorage.getItem(STORAGE_KEY);
    const purchases = existingData ? JSON.parse(existingData) : [];
    
    const newPurchase = {
      ...purchase,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    purchases.push(newPurchase);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
    return newPurchase;
  } catch (error) {
    console.error('Erro ao salvar compra:', error);
    throw error;
  }
};

export const getAllPurchases = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
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
