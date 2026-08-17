import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SHOPPING_LIST: '@mercado:shoppingList',
  MASTER_LIST: '@mercado:masterList',
  PRODUCT_CATALOG: '@mercado:productCatalog',
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

export const normalizeProductText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

export const getProductKey = (item) => `${normalizeProductText(item?.name)}::${normalizeProductText(item?.brand)}`;

export const UNITS = ['un', 'dz', 'kg', 'g', 'L', 'mL', 'm', 'cx', 'pacote'];
export const WEIGHT_VOLUME_UNITS = ['kg', 'g', 'L', 'mL'];

export const getDefaultPriceUnit = (unit) => {
  if (unit === 'kg' || unit === 'g') return 'kg';
  if (unit === 'L' || unit === 'mL') return 'L';
  return unit || 'un';
};

const CATEGORY_PURCHASE_DEFAULTS = {
  hortifruti: { quantity: '1', unit: 'kg' },
  proteinas: { quantity: '1', unit: 'kg' },
  laticinios_ovos: { quantity: '1', unit: 'un' }
};

export const getPurchaseDefaults = (categoryId) => {
  const category = normalizeCategoryId(categoryId);
  return CATEGORY_PURCHASE_DEFAULTS[category] || { quantity: '1', unit: 'un' };
};

export const getItemTotal = (item) => {
  const price = Number(item?.price);
  if (!Number.isFinite(price)) return 0;
  if (item?.priceMode === 'unit' || item?.priceIsTotal === false) {
    let quantity = Number(item?.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return 0;

    const quantityUnit = item?.unit || 'un';
    const priceUnit = item?.priceUnit || getDefaultPriceUnit(quantityUnit);
    if (quantityUnit === 'g' && priceUnit === 'kg') quantity /= 1000;
    if (quantityUnit === 'kg' && priceUnit === 'g') quantity *= 1000;
    if (quantityUnit === 'mL' && priceUnit === 'L') quantity /= 1000;
    if (quantityUnit === 'L' && priceUnit === 'mL') quantity *= 1000;
    return price * quantity;
  }
  return price;
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
    const productKey = getProductKey(item);
    const existing = current.find(currentItem => getProductKey(currentItem) === productKey);
    if (existing) return existing;
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

// Catálogo interno da lista única. A chave antiga da Lista Mestra só é lida durante a migração.
export const getProductCatalog = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCT_CATALOG);
    return data ? JSON.parse(data).map(normalizeItemCategory) : [];
  } catch (error) {
    console.error('Erro ao buscar catálogo de produtos:', error);
    return [];
  }
};

export const saveProductCatalog = async (items) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PRODUCT_CATALOG, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error('Erro ao salvar catálogo de produtos:', error);
    return false;
  }
};

export const upsertProductCatalog = async (item) => {
  try {
    const current = await getProductCatalog();
    const productKey = getProductKey(item);
    const existingIndex = current.findIndex(product =>
      (item.catalogId && product.id === item.catalogId) || getProductKey(product) === productKey
    );
    const normalized = {
      name: String(item.name || '').trim(),
      brand: String(item.brand || '').trim(),
      category: normalizeCategoryId(item.category)
    };

    if (existingIndex >= 0) {
      const updatedProduct = { ...current[existingIndex], ...normalized };
      const updated = [...current];
      updated[existingIndex] = updatedProduct;
      await saveProductCatalog(updated);
      return updatedProduct;
    }

    const newProduct = {
      ...normalized,
      id: item.catalogId || `catalog-${Date.now()}`
    };
    await saveProductCatalog([...current, newProduct]);
    return newProduct;
  } catch (error) {
    console.error('Erro ao atualizar catálogo de produtos:', error);
    return null;
  }
};

export const updateProductCatalogItem = async (id, updates) => {
  try {
    const current = await getProductCatalog();
    const updated = current.map(item => item.id === id
      ? {
          ...item,
          name: String(updates.name ?? item.name).trim(),
          brand: String(updates.brand ?? item.brand).trim(),
          category: normalizeCategoryId(updates.category ?? item.category)
        }
      : item
    );
    await saveProductCatalog(updated);
    return true;
  } catch (error) {
    console.error('Erro ao editar produto do catálogo:', error);
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
    const productKey = getProductKey(item);
    const existing = current.find(currentItem => getProductKey(currentItem) === productKey);
    if (existing) return existing;

    const category = normalizeCategoryId(item.category);
    const defaults = getPurchaseDefaults(category);
    const unit = item.unit ?? defaults.unit;
    const priceMode = item.priceMode ?? (WEIGHT_VOLUME_UNITS.includes(unit) ? 'unit' : 'total');
    const catalog = await getProductCatalog();
    const catalogProduct = catalog.find(product =>
      (item.catalogId && product.id === item.catalogId) || getProductKey(product) === productKey
    );
    const newItem = {
      ...item,
      catalogId: item.catalogId || catalogProduct?.id,
      category,
      id: Date.now().toString(),
      status: 'pending', // pending, purchased
      purchaseDate: null,
      price: null,
      priceMode,
      priceIsTotal: priceMode !== 'unit',
      priceUnit: item.priceUnit ?? getDefaultPriceUnit(unit),
      quantity: item.quantity !== undefined ? item.quantity : (WEIGHT_VOLUME_UNITS.includes(unit) ? null : defaults.quantity),
      unit,
      isPromotion: false,
      originalPrice: null
    };
    const catalogItem = await upsertProductCatalog({ ...newItem, catalogId: newItem.catalogId });
    const savedItem = { ...newItem, catalogId: catalogItem?.id || newItem.catalogId };
    await saveShoppingList([...current, savedItem]);
    return savedItem;
  } catch (error) {
    console.error('Erro ao adicionar à lista de compras:', error);
    return null;
  }
};

export const updateShoppingItem = async (id, updates) => {
  try {
    const current = await getShoppingList();
    const existing = current.find(item => item.id === id);
    const updated = current.map(item =>
      item.id === id
        ? { ...item, ...updates, category: normalizeCategoryId(updates.category ?? item.category) }
        : item
    );
    const saved = await saveShoppingList(updated);

    if (saved) {
      const updatedItem = updated.find(item => item.id === id);
      if (updatedItem) {
        await upsertProductCatalog({ ...updatedItem, catalogId: updatedItem.catalogId || existing?.catalogId });
        if (existing?.status === 'purchased') {
          await updatePurchaseHistoryForShoppingItem(id, updatedItem);
        }
      }
    }

    return saved;
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    return false;
  }
};

export const migrateToUnifiedList = async () => {
  try {
    const [shoppingList, masterList, productCatalog, history] = await Promise.all([
      getShoppingList(),
      getMasterList(),
      getProductCatalog(),
      getPurchaseHistory()
    ]);
    const catalog = [];
    const findCatalog = (item) => catalog.find(product => getProductKey(product) === getProductKey(item));
    const addCatalogProduct = (item, preferredId) => {
      const existing = findCatalog(item);
      if (existing) return existing;
      const product = {
        name: String(item.name || '').trim(),
        brand: String(item.brand || '').trim(),
        category: normalizeCategoryId(item.category),
        id: preferredId || item.catalogId || `catalog-${Date.now()}-${catalog.length}`
      };
      catalog.push(product);
      return product;
    };

    productCatalog.forEach(item => addCatalogProduct(item, item.id));
    masterList.forEach(item => addCatalogProduct(item, `catalog-legacy-${item.id || Date.now()}-${catalog.length}`));
    shoppingList.forEach(item => addCatalogProduct(item, item.catalogId));
    history.forEach(item => addCatalogProduct(item, item.catalogId || `catalog-history-${item.id || Date.now()}-${catalog.length}`));

    const unified = shoppingList.map(item => {
      const product = findCatalog(item) || addCatalogProduct(item, item.catalogId);
      return { ...item, catalogId: product.id, category: normalizeCategoryId(item.category || product.category) };
    });

    await saveProductCatalog(catalog);
    await saveShoppingList(unified);
    return unified;
  } catch (error) {
    console.error('Erro ao migrar para lista única:', error);
    return getShoppingList();
  }
};

export const startNewShoppingRound = async () => {
  try {
    // A rodada ativa é temporária. O catálogo permanente e o histórico ficam intactos.
    await saveShoppingList([]);
    return true;
  } catch (error) {
    console.error('Erro ao iniciar nova rodada:', error);
    return false;
  }
};

export const unmarkAsPurchased = async (id) => {
  try {
    const current = await getShoppingList();
    const currentItem = current.find(item => item.id === id);
    const updated = current.map(item => item.id === id
      ? { ...item, status: 'pending', purchaseDate: null, purchaseId: null, price: null, originalPrice: null }
      : item
    );
    const saved = await saveShoppingList(updated);
    if (!saved) return false;

    const history = await getPurchaseHistory();
    const historyWithoutCurrentRound = currentItem?.purchaseId
      ? history.filter(item => item.purchaseId !== currentItem.purchaseId)
      : history.filter(item => item.shoppingItemId !== id);
    await savePurchaseHistory(historyWithoutCurrentRound);
    return true;
  } catch (error) {
    console.error('Erro ao desmarcar compra:', error);
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

export const updatePurchaseHistoryForShoppingItem = async (shoppingItemId, updates) => {
  try {
    const current = await getPurchaseHistory();
    const updated = current.map(item => {
      const matchesCurrentPurchase = updates.purchaseId
        ? item.purchaseId === updates.purchaseId
        : item.shoppingItemId === shoppingItemId;
      return matchesCurrentPurchase
        ? { ...item, ...updates, category: normalizeCategoryId(updates.category ?? item.category) }
        : item;
    });
    await savePurchaseHistory(updated);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar compra no histórico:', error);
    return false;
  }
};

export const markAsPurchased = async (id, purchaseData) => {
  try {
    const current = await getShoppingList();
    const purchaseDate = new Date().toISOString();
    const purchaseId = `${id}-${Date.now()}`;
    const updated = current.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: 'purchased',
          purchaseDate,
          purchaseId,
          priceMode: purchaseData.priceMode || item.priceMode || 'total',
          priceIsTotal: purchaseData.priceIsTotal ?? item.priceIsTotal ?? true,
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
        shoppingItemId: id,
        purchaseId,
        purchaseDate,
        priceIsTotal: true,
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

export const updatePurchaseHistoryItem = async (id, updates) => {
  try {
    const current = await getPurchaseHistory();
    const existing = current.find(item => item.id === id);
    const updated = current.map(item => item.id === id
      ? { ...item, ...updates, category: normalizeCategoryId(updates.category ?? item.category) }
      : item
    );
    const saved = await savePurchaseHistory(updated);
    if (!saved) return false;

    if (existing?.shoppingItemId && existing?.purchaseId && updates.purchaseDate) {
      const shoppingList = await getShoppingList();
      await saveShoppingList(shoppingList.map(item => item.id === existing.shoppingItemId && item.purchaseId === existing.purchaseId
        ? { ...item, purchaseDate: updates.purchaseDate }
        : item
      ));
    }
    return true;
  } catch (error) {
    console.error('Erro ao atualizar compra no histórico:', error);
    return false;
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
    const [shoppingList, productCatalog, masterList, history] = await Promise.all([
      getShoppingList(),
      getProductCatalog(),
      getMasterList(),
      getPurchaseHistory()
    ]);
    const queryLower = normalizeProductText(query);
    const products = [...shoppingList, ...productCatalog, ...masterList, ...history];
    const unique = products.filter((item, index, all) =>
      index === all.findIndex(candidate => getProductKey(candidate) === getProductKey(item))
    );

    return unique
      .filter(item => {
        const name = normalizeProductText(item.name);
        const brand = normalizeProductText(item.brand);
        return name.includes(queryLower) || brand.includes(queryLower);
      })
      .map(item => ({ ...item, source: item.status === 'purchased' ? 'history' : 'list' }))
      .slice(0, 10);
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
      return sum + getItemTotal(item);
    }, 0);
    
    const categoryTotals = {};
    CATEGORIES.forEach(cat => {
      categoryTotals[cat.id] = 0;
    });
    
    monthPurchases.forEach(item => {
      if (categoryTotals[item.category] !== undefined) {
        categoryTotals[item.category] += getItemTotal(item);
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
