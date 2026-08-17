import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getShoppingList, getProductCatalog, addToShoppingList, updateShoppingItem, updateProductCatalogItem, removeFromShoppingList, startNewShoppingRound, markAsPurchased, unmarkAsPurchased, migrateToUnifiedList, searchSuggestions, getPurchaseDefaults, getDefaultPriceUnit, getItemTotal, getProductKey, restoreToShoppingList, CATEGORIES, UNITS, WEIGHT_VOLUME_UNITS } from '../utils/storage';

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');
const parseMoneyDigits = (digits) => digits ? Number(digits) / 100 : null;
const formatMoneyDigits = (digits) => {
  if (!digits) return '';
  const amount = Number(digits) / 100;
  return amount.toFixed(2).replace('.', ',');
};
const moneyDigitsFromValue = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return String(Math.round(Number(value) * 100));
};
const parseQuantity = (value) => Number.parseFloat(String(value || '').replace(',', '.')) || 0;

export default function ShoppingListScreen() {
  const insets = useSafeAreaInsets();
  const [shoppingList, setShoppingList] = useState([]);
  const [productCatalog, setProductCatalog] = useState([]);
  const [catalogExpanded, setCatalogExpanded] = useState(false);
  const [undoItem, setUndoItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', brand: '', category: 'outros' });
  const [catalogEditId, setCatalogEditId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [mainSearchQuery, setMainSearchQuery] = useState('');
  const [mainSuggestions, setMainSuggestions] = useState([]);
  const [purchaseData, setPurchaseData] = useState({ priceDigits: '', quantity: '', unit: 'un', priceMode: 'total', isPromotion: false, originalPriceDigits: '' });
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [categoryPickerMode, setCategoryPickerMode] = useState('filter');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [unitPickerTarget, setUnitPickerTarget] = useState('purchase');

  const loadList = useCallback(async () => {
    const list = await migrateToUnifiedList();
    const catalog = await getProductCatalog();
    setShoppingList(list);
    setProductCatalog(catalog);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [loadList])
  );

  const handleOpenAddItem = (initialName = '') => {
    setCatalogEditId(null);
    setNewItem({ name: initialName, brand: '', category: 'outros' });
    setSearchQuery(initialName);
    setSuggestions([]);
    setModalVisible(true);
  };

  const handleMainSearch = async (text) => {
    setMainSearchQuery(text);
    if (text.trim().length >= 2) {
      const results = await searchSuggestions(text);
      setMainSuggestions(results);
    } else {
      setMainSuggestions([]);
    }
  };

  const handleSelectMainSuggestion = async (suggestion) => {
    const added = await addToShoppingList({
      name: suggestion.name,
      brand: suggestion.brand || '',
      category: suggestion.category || 'outros',
      catalogId: suggestion.source === 'catalog' ? suggestion.id : undefined
    });
    if (!added) {
      Alert.alert('Erro', 'Não foi possível adicionar o produto. Tente novamente.');
      return;
    }
    if (added.status === 'purchased') {
      Alert.alert('Já comprado nesta rodada', 'Para comprar novamente, toque em “Nova compra” e depois adicione o produto pela lista geral.');
      return;
    }
    setMainSearchQuery('');
    setMainSuggestions([]);
    loadList();
  };

  const handleAddItem = async () => {
    const name = newItem.name.trim();
    if (!name) {
      Alert.alert('Erro', 'Digite o nome do produto');
      return;
    }

    if (catalogEditId) {
      const saved = await updateProductCatalogItem(catalogEditId, {
        name,
        brand: newItem.brand.trim(),
        category: newItem.category
      });
      if (!saved) {
        Alert.alert('Erro', 'Não foi possível editar o produto. Tente novamente.');
        return;
      }
      const activeItem = shoppingList.find(item => item.catalogId === catalogEditId);
      if (activeItem) {
        await updateShoppingItem(activeItem.id, { name, brand: newItem.brand.trim(), category: newItem.category });
      }
      setCatalogEditId(null);
      setNewItem({ name: '', brand: '', category: 'outros' });
      setModalVisible(false);
      loadList();
      return;
    }

    const addedItem = await addToShoppingList({
      name,
      brand: newItem.brand.trim(),
      category: newItem.category
    });

    if (!addedItem) {
      Alert.alert('Erro', 'Não foi possível adicionar o produto. Tente novamente.');
      return;
    }
    if (addedItem.status === 'purchased') {
      Alert.alert('Já comprado nesta rodada', 'Para comprar novamente, toque em “Nova compra” e depois adicione o produto pela lista geral.');
      return;
    }

    setNewItem({ name: '', brand: '', category: 'outros' });
    setSearchQuery('');
    setSuggestions([]);
    setMainSearchQuery('');
    setMainSuggestions([]);
    setModalVisible(false);
    loadList();
  };

  const handleSelectSuggestion = (suggestion) => {
    setNewItem({
      name: suggestion.name,
      brand: suggestion.brand || '',
      category: suggestion.category || 'outros'
    });
    setSuggestions([]);
    setSearchQuery('');
  };

  const handleSearch = async (text) => {
    setNewItem(current => ({ ...current, name: text }));
    setSearchQuery(text);
    if (text.length >= 2) {
      const results = await searchSuggestions(text);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const handleOpenCatalogEdit = (item) => {
    setCatalogEditId(item.id);
    setNewItem({ name: item.name || '', brand: item.brand || '', category: item.category || 'outros' });
    setModalVisible(true);
  };

  const handleOpenEditItem = (item) => {
    const defaults = getPurchaseDefaults(item.category);
    const unit = item.unit || defaults.unit;
    setEditingItem({
      id: item.id,
      name: item.name || '',
      brand: item.brand || '',
      category: item.category || 'outros',
      quantity: item.quantity === null || item.quantity === undefined ? '' : String(item.quantity),
      unit,
      priceMode: item.priceMode || (WEIGHT_VOLUME_UNITS.includes(unit) ? 'unit' : 'total'),
      priceUnit: item.priceUnit || getDefaultPriceUnit(unit),
      priceDigits: moneyDigitsFromValue(item.price)
    });
    setEditModalVisible(true);
  };

  const openCategoryPicker = (mode) => {
    setCategoryPickerMode(mode);
    setCategoryQuery('');
    setCategoryPickerVisible(true);
  };

  const closeCategoryPicker = () => {
    setCategoryPickerVisible(false);
    setCategoryQuery('');
  };

  const openUnitPicker = (target) => {
    setUnitPickerTarget(target);
    setUnitModalVisible(true);
  };

  const chooseUnit = (unit) => {
    if (unitPickerTarget === 'edit') {
      const priceMode = WEIGHT_VOLUME_UNITS.includes(unit) ? 'unit' : 'total';
      setEditingItem({ ...editingItem, unit, priceMode, priceUnit: getDefaultPriceUnit(unit) });
    } else {
      const priceMode = WEIGHT_VOLUME_UNITS.includes(unit) ? 'unit' : 'total';
      setPurchaseData({ ...purchaseData, unit, priceMode, priceUnit: getDefaultPriceUnit(unit) });
    }
    setUnitModalVisible(false);
  };

  const chooseCategory = (categoryId) => {
    if (categoryPickerMode === 'filter') {
      setSelectedCategory(categoryId === 'todos' ? null : categoryId);
    } else if (categoryPickerMode === 'new') {
      setNewItem({ ...newItem, category: categoryId });
    } else if (categoryPickerMode === 'edit') {
      setEditingItem({ ...editingItem, category: categoryId });
    }
    closeCategoryPicker();
  };

  const pickerCategory = categoryPickerMode === 'filter'
    ? selectedCategory
    : categoryPickerMode === 'new'
      ? newItem.category
      : editingItem?.category;
  const filteredPickerCategories = CATEGORIES.filter(category =>
    category.name.toLowerCase().includes(categoryQuery.trim().toLowerCase())
  );

  const handleSaveEditedItem = async () => {
    const name = editingItem?.name.trim();
    if (!name) {
      Alert.alert('Erro', 'Digite o nome do produto');
      return;
    }

    const quantity = Number.parseFloat(String(editingItem.quantity || '').replace(',', '.'));
    const currentItem = shoppingList.find(item => item.id === editingItem.id);
    if (currentItem?.status === 'purchased' && (!quantity || quantity <= 0)) {
      Alert.alert('Erro', 'Uma compra já registrada precisa ter uma quantidade válida');
      return;
    }

    const saved = await updateShoppingItem(editingItem.id, {
      name,
      brand: editingItem.brand.trim(),
      category: editingItem.category,
      quantity: quantity > 0 ? quantity : null,
      unit: editingItem.unit,
      price: parseMoneyDigits(editingItem.priceDigits),
      priceMode: editingItem.priceMode,
      priceUnit: editingItem.priceUnit || getDefaultPriceUnit(editingItem.unit),
      priceIsTotal: editingItem.priceMode !== 'unit',
    });

    if (!saved) {
      Alert.alert('Erro', 'Não foi possível salvar as alterações. Tente novamente.');
      return;
    }

    setEditModalVisible(false);
    setEditingItem(null);
    loadList();
  };

  const handleOpenPurchase = (item) => {
    const defaults = getPurchaseDefaults(item.category);
    const unit = defaults.unit === 'kg' && item.unit === 'un'
      ? defaults.unit
      : (item.unit || defaults.unit);

    setSelectedItem(item);
    const priceMode = item.priceMode || (WEIGHT_VOLUME_UNITS.includes(unit) ? 'unit' : 'total');
    const initialQuantity = item.quantity === null || item.quantity === undefined || (WEIGHT_VOLUME_UNITS.includes(unit) && item.quantity === 1 && !item.price && !item.priceMode)
      ? ''
      : String(item.quantity);
    setPurchaseData({
      priceDigits: moneyDigitsFromValue(item.price),
      quantity: initialQuantity,
      unit,
      priceMode,
      priceUnit: item.priceUnit || getDefaultPriceUnit(unit),
      isPromotion: Boolean(item.isPromotion),
      originalPriceDigits: moneyDigitsFromValue(item.originalPrice)
    });
    setPurchaseModalVisible(true);
  };

  const handleConfirmPurchase = async () => {
    const quantity = Number.parseFloat(String(purchaseData.quantity || '').replace(',', '.'));
    const price = parseMoneyDigits(purchaseData.priceDigits);
    if (purchaseData.priceDigits && (!quantity || quantity <= 0)) {
      Alert.alert('Erro', 'Informe a quantidade para calcular o valor da compra');
      return;
    }
    if (purchaseData.priceMode === 'unit' && purchaseData.priceDigits && (!quantity || quantity <= 0)) {
      Alert.alert('Erro', `Informe a quantidade em ${purchaseData.unit} para calcular o total`);
      return;
    }

    const purchased = await markAsPurchased(selectedItem.id, {
      price,
      priceMode: purchaseData.priceMode,
      priceUnit: purchaseData.priceUnit || getDefaultPriceUnit(purchaseData.unit),
      priceIsTotal: purchaseData.priceMode !== 'unit',
      quantity: quantity || null,
      unit: purchaseData.unit,
      isPromotion: purchaseData.isPromotion,
      originalPrice: purchaseData.isPromotion ? parseMoneyDigits(purchaseData.originalPriceDigits) : null
    });

    if (!purchased) {
      Alert.alert('Erro', 'Não foi possível registrar a compra. Tente novamente.');
      return;
    }

    setPurchaseModalVisible(false);
    setSelectedItem(null);
    loadList();
  };

  const handleTogglePurchased = async (item) => {
    const updated = item.status === 'purchased'
      ? await unmarkAsPurchased(item.id)
      : await markAsPurchased(item.id, {
        price: item.price ?? null,
        priceMode: item.priceMode || 'total',
        priceUnit: item.priceUnit || getDefaultPriceUnit(item.unit),
        priceIsTotal: item.priceMode !== 'unit',
        quantity: item.quantity ?? null,
        unit: item.unit || 'un',
        isPromotion: Boolean(item.isPromotion),
        originalPrice: item.originalPrice ?? null
      });

    if (!updated) {
      Alert.alert('Erro', 'Não foi possível atualizar o item. Tente novamente.');
      return;
    }
    loadList();
  };

  const handleDelete = async (id) => {
    const itemToRemove = shoppingList.find(item => item.id === id);
    if (!itemToRemove) return;

    Alert.alert('Retirar desta compra?', `${itemToRemove.name} continuará na lista geral e poderá ser escolhido novamente depois.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Retirar', style: 'destructive', onPress: async () => {
        const removed = await removeFromShoppingList(id);
        if (!removed) {
          Alert.alert('Erro', 'Não foi possível retirar o produto desta compra.');
          return;
        }
        setUndoItem(itemToRemove);
        loadList();
        setTimeout(() => {
          setUndoItem(current => current?.id === id ? null : current);
        }, 5000);
      }}
    ]);
  };

  const handleUndoRemove = async () => {
    if (!undoItem) return;
    const restored = await restoreToShoppingList(undoItem);
    if (!restored) {
      Alert.alert('Erro', 'Não foi possível desfazer a retirada.');
      return;
    }
    setUndoItem(null);
    loadList();
  };

  const getActiveItemForCatalog = (product) => shoppingList.find(item =>
    (product.id && item.catalogId === product.id) || getProductKey(item) === getProductKey(product)
  );

  const handleCatalogRoundToggle = async (product) => {
    const activeItem = getActiveItemForCatalog(product);
    if (activeItem) {
      await handleTogglePurchased(activeItem);
      return;
    }

    const added = await addToShoppingList({
      name: product.name,
      brand: product.brand || '',
      category: product.category || 'outros',
      catalogId: product.id
    });
    if (!added) {
      Alert.alert('Erro', 'Não foi possível adicionar o produto à compra atual.');
      return;
    }
    loadList();
  };

  const handleStartNewRound = () => {
    Alert.alert(
      'Nova compra',
      'Os produtos da compra atual ficarão fora da nova rodada, mas continuarão visíveis na lista geral. O Histórico não será apagado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Começar',
          onPress: async () => {
            const started = await startNewShoppingRound();
            if (!started) {
              Alert.alert('Erro', 'Não foi possível iniciar uma nova compra.');
              return;
            }
            loadList();
          }
        }
      ]
    );
  };

  const calculateTotal = () => shoppingList
    .filter(item => item.status === 'purchased')
    .reduce((total, item) => total + getItemTotal(item), 0);

  const categoryOrder = CATEGORIES.reduce((order, category, index) => ({ ...order, [category.id]: index }), {});
  const filteredCatalog = [...(selectedCategory
    ? productCatalog.filter(item => item.category === selectedCategory)
    : productCatalog)].sort((first, second) => {
      const categoryDifference = (categoryOrder[first.category] ?? 999) - (categoryOrder[second.category] ?? 999);
      return categoryDifference || String(first.name || '').localeCompare(String(second.name || ''), 'pt-BR');
    });
  const purchasedItems = shoppingList.filter(item => item.status === 'purchased');
  const pendingRoundCount = shoppingList.filter(item => item.status !== 'purchased').length;
  const pendingCatalogItems = filteredCatalog.filter(product => getActiveItemForCatalog(product)?.status === 'pending');
  const purchasedCatalogItems = filteredCatalog.filter(product => getActiveItemForCatalog(product)?.status === 'purchased');
  const otherCatalogItems = filteredCatalog.filter(product => !getActiveItemForCatalog(product));

  const renderCatalogItem = ({ item }) => {
    const category = CATEGORIES.find(c => c.id === item.category);
    const activeItem = getActiveItemForCatalog(item);
    const isPurchased = activeItem?.status === 'purchased';
    const isInRound = Boolean(activeItem);
    const total = activeItem ? getItemTotal(activeItem) : 0;

    return (
      <View style={[styles.itemCard, isPurchased && styles.itemPurchased]}>
        <TouchableOpacity
          accessibilityLabel={activeItem ? `Editar compra de ${item.name}` : `Editar produto ${item.name}`}
          style={styles.itemLeft}
          onPress={() => activeItem ? handleOpenEditItem(activeItem) : handleOpenCatalogEdit(item)}
        >
          <View style={[styles.itemIcon, { backgroundColor: category?.color || '#9E9E9E' }]}>
            <MaterialCommunityIcons name={category?.icon || 'shape-outline'} size={20} color="#fff" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, isPurchased && styles.itemTextPurchased]}>{item.name}</Text>
            {item.brand ? <Text style={[styles.itemBrand, isPurchased && styles.itemTextPurchased]}>{item.brand}</Text> : null}
            <Text style={styles.itemCategory}>{category?.name || 'Outros'}</Text>
            <Text style={[styles.catalogStatus, isPurchased && styles.catalogStatusPurchased]}>
              {isPurchased ? 'Comprado nesta compra' : isInRound ? 'A comprar nesta compra' : 'Fora da compra atual'}
            </Text>
            {isPurchased && activeItem.price !== null && activeItem.price !== undefined ? (
              <Text style={styles.itemPrice}>
                {activeItem.priceMode === 'unit' ? `Total estimado: R$ ${total.toFixed(2).replace('.', ',')}` : `R$ ${total.toFixed(2).replace('.', ',')}`}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <View style={styles.itemActions}>
          <TouchableOpacity
            accessibilityLabel={isPurchased ? `Desmarcar ${item.name} como comprado` : isInRound ? `Marcar ${item.name} como comprado` : `Adicionar ${item.name} à compra atual`}
            style={[styles.catalogCheckButton, isPurchased && styles.catalogCheckButtonActive]}
            onPress={() => handleCatalogRoundToggle(item)}
          >
            <Ionicons
              name={isPurchased ? 'checkmark' : isInRound ? 'checkmark-outline' : 'add'}
              size={22}
              color={isPurchased ? '#fff' : '#4CAF50'}
            />
          </TouchableOpacity>
          {activeItem?.status === 'pending' && (
            <TouchableOpacity accessibilityLabel={`Retirar ${item.name} da compra atual`} onPress={() => handleDelete(activeItem.id)}>
              <Ionicons name="remove-circle-outline" size={20} color="#FFB74D" />
            </TouchableOpacity>
          )}
          <TouchableOpacity accessibilityLabel={`Editar produto ${item.name}`} onPress={() => handleOpenCatalogEdit(item)}>
            <Ionicons name="create-outline" size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Barra fixa: fica abaixo do relógio, bateria e demais ícones do sistema. */}
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Lista de compras</Text>
          <Text style={styles.headerSubtitle}>Veja seus produtos e marque o que precisa comprar</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total informado:</Text>
            <Text style={styles.totalValue}>R$ {calculateTotal().toFixed(2).replace('.', ',')}</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Abrir mais opções"
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent} nestedScrollEnabled>
      {/* Busca principal */}
      <View style={styles.mainSearchSection}>
        <View style={styles.mainSearchField}>
          <Ionicons name="search-outline" size={21} color="#4CAF50" />
          <TextInput
            style={styles.mainSearchInput}
            placeholder="Buscar ou adicionar produto"
            placeholderTextColor="#8888aa"
            value={mainSearchQuery}
            onChangeText={handleMainSearch}
            returnKeyType="search"
          />
          {mainSearchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => { setMainSearchQuery(''); setMainSuggestions([]); }}>
              <Ionicons name="close-circle" size={20} color="#8888aa" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity accessibilityLabel="Cadastrar novo produto" onPress={() => handleOpenAddItem()}>
              <Ionicons name="add-circle-outline" size={22} color="#4CAF50" />
            </TouchableOpacity>
          )}
        </View>
        {mainSearchQuery.trim().length >= 2 && (
          <View style={styles.mainSuggestionsList}>
            {mainSuggestions.map((suggestion, index) => (
              <TouchableOpacity key={`${suggestion.name}-${suggestion.brand || ''}-${index}`} style={styles.mainSuggestionItem} onPress={() => handleSelectMainSuggestion(suggestion)}>
                <View style={styles.mainSuggestionCopy}>
                  <Text style={styles.suggestionName}>{suggestion.name}</Text>
                  {suggestion.brand ? <Text style={styles.suggestionBrand}>{suggestion.brand}</Text> : null}
                </View>
                <Ionicons name="add-circle-outline" size={23} color="#4CAF50" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.newProductSuggestion} onPress={() => handleOpenAddItem(mainSearchQuery.trim())}>
              <Ionicons name="create-outline" size={21} color="#FFB74D" />
              <Text style={styles.newProductSuggestionText}>Adicionar novo produto</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.roundSummary}>
        <View style={styles.roundSummaryCopy}>
          <Text style={styles.roundSummaryTitle}>Compra atual</Text>
          <Text style={styles.roundSummaryText}>{pendingRoundCount} a comprar • {purchasedItems.length} comprados</Text>
        </View>
        {purchasedItems.length > 0 && (
          <TouchableOpacity style={styles.newRoundButton} onPress={handleStartNewRound}>
            <Ionicons name="refresh-outline" size={17} color="#fff" />
            <Text style={styles.newRoundButtonText}>Nova compra</Text>
          </TouchableOpacity>
        )}
      </View>

      {pendingRoundCount === 0 && purchasedItems.length === 0 && filteredCatalog.length > 0 && (
        <View style={styles.emptyRoundHint}>
          <Ionicons name="checkmark-circle-outline" size={19} color="#FFB74D" />
          <Text style={styles.emptyRoundHintText}>Nenhum produto está na compra atual. Use o + para escolher o que vai comprar.</Text>
        </View>
      )}

      {pendingCatalogItems.length > 0 && (
        <View style={styles.listSectionBlock}>
          <View style={styles.listSectionHeader}>
            <View style={styles.listSectionCopy}>
              <Text style={styles.listSectionTitle}>A comprar agora</Text>
              <Text style={styles.listSectionHelper}>Itens selecionados para esta compra</Text>
            </View>
            <Text style={styles.listSectionCount}>{pendingCatalogItems.length}</Text>
          </View>
          <FlatList
            data={pendingCatalogItems}
            renderItem={renderCatalogItem}
            keyExtractor={item => `pending-${item.id}`}
            scrollEnabled={false}
          />
        </View>
      )}

      {purchasedCatalogItems.length > 0 && (
        <View style={[styles.listSectionBlock, styles.purchasedSectionBlock]}>
          <View style={styles.listSectionHeader}>
            <View style={styles.listSectionCopy}>
              <Text style={styles.listSectionTitle}>Comprados nesta compra</Text>
              <Text style={styles.listSectionHelper}>Já marcados e registrados no Histórico</Text>
            </View>
            <Text style={[styles.listSectionCount, styles.purchasedSectionCount]}>{purchasedCatalogItems.length}</Text>
          </View>
          <FlatList
            data={purchasedCatalogItems}
            renderItem={renderCatalogItem}
            keyExtractor={item => `purchased-${item.id}`}
            scrollEnabled={false}
          />
        </View>
      )}

      <TouchableOpacity
        style={styles.catalogHeader}
        onPress={() => setCatalogExpanded(current => !current)}
        accessibilityLabel={catalogExpanded ? 'Recolher lista completa de produtos' : 'Mostrar lista completa de produtos'}
        accessibilityState={{ expanded: catalogExpanded }}
      >
        <View style={styles.catalogHeaderCopy}>
          <Text style={styles.sectionTitle}>Todos os produtos</Text>
          <Text style={styles.catalogHelper}>
            {catalogExpanded ? 'Toque para recolher a lista geral' : 'Lista geral recolhida · toque para mostrar'}
          </Text>
        </View>
        <View style={styles.catalogHeaderAction}>
          <Text style={styles.catalogCount}>{filteredCatalog.length}</Text>
          <Ionicons name={catalogExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#4CAF50" />
        </View>
      </TouchableOpacity>

      {catalogExpanded && (
        <>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Filtrar produtos por setor</Text>
            <TouchableOpacity style={styles.categoryField} onPress={() => openCategoryPicker('filter')}>
              <Ionicons name="funnel-outline" size={20} color="#4CAF50" />
              <Text style={styles.categoryFieldText}>
                {selectedCategory ? CATEGORIES.find(category => category.id === selectedCategory)?.name : 'Todos os setores'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#aaaac0" />
            </TouchableOpacity>
          </View>

          {otherCatalogItems.length > 0 ? (
            <FlatList
              data={otherCatalogItems}
              renderItem={renderCatalogItem}
              keyExtractor={item => `catalog-${item.id}`}
              scrollEnabled={false}
            />
          ) : filteredCatalog.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="list-outline" size={64} color="#8888aa" />
              <Text style={styles.emptyText}>Sua lista geral está vazia</Text>
              <Text style={styles.emptySubtext}>Use a busca ou o botão + para cadastrar os produtos que você compra normalmente.</Text>
            </View>
          ) : (
            <Text style={styles.catalogEmptyFiltered}>Todos os produtos desta seção já estão na compra atual.</Text>
          )}
        </>
      )}

      </ScrollView>

      {undoItem && (
        <View style={styles.undoBar}>
          <Text style={styles.undoBarText}>{undoItem.name} foi retirado desta compra</Text>
          <TouchableOpacity onPress={handleUndoRemove} accessibilityLabel={`Desfazer retirada de ${undoItem.name}`}>
            <Text style={styles.undoActionText}>Desfazer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Menu sanduíche */}
      <Modal visible={menuVisible} animationType="fade" transparent onRequestClose={() => setMenuVisible(false)}>
        <View style={[styles.menuOverlay, { paddingTop: insets.top + 8 }]}>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Mais opções</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert('Como usar', 'Esta tela mostra todos os produtos que você costuma comprar. Toque no check para colocar um produto na compra atual. O Histórico guarda as compras anteriores e a opção “Nova compra” limpa apenas os checks e preços da rodada atual.');
              }}
            >
              <Ionicons name="help-circle-outline" size={22} color="#4CAF50" />
              <Text style={styles.menuItemText}>Como usar a lista</Text>
            </TouchableOpacity>
            {selectedCategory && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setSelectedCategory(null);
                  setMenuVisible(false);
                }}
              >
                <Ionicons name="funnel-outline" size={22} color="#4CAF50" />
                <Text style={styles.menuItemText}>Limpar filtro de setor</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuCloseButton} onPress={() => setMenuVisible(false)}>
              <Text style={styles.cancelButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Adicionar Item */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContent}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{catalogEditId ? 'Editar produto da lista geral' : 'Adicionar produto'}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nome do produto"
              placeholderTextColor="#8888aa"
              value={newItem.name}
              onChangeText={handleSearch}
            />
            
            {suggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {suggestions.map((sug, index) => (
                  <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => handleSelectSuggestion(sug)}>
                    <Text style={styles.suggestionName}>{sug.name}</Text>
                    {sug.brand && <Text style={styles.suggestionBrand}>{sug.brand}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            <TextInput
              style={styles.input}
              placeholder="Marca (opcional)"
              placeholderTextColor="#8888aa"
              value={newItem.brand}
              onChangeText={(text) => setNewItem({...newItem, brand: text})}
            />
            
            <TouchableOpacity style={styles.categoryField} onPress={() => openCategoryPicker('new')}>
              <MaterialCommunityIcons name={CATEGORIES.find(category => category.id === newItem.category)?.icon || 'shape-outline'} size={20} color="#4CAF50" />
              <Text style={styles.categoryFieldText}>{CATEGORIES.find(category => category.id === newItem.category)?.name || 'Outros'}</Text>
              <Ionicons name="search-outline" size={18} color="#aaaac0" />
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddItem}>
                <Text style={styles.saveButtonText}>{catalogEditId ? 'Salvar produto' : 'Adicionar produto'}</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContent}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Editar Item</Text>

              <TextInput
                style={styles.input}
                placeholder="Nome do produto"
                placeholderTextColor="#8888aa"
                value={editingItem?.name || ''}
                onChangeText={(name) => setEditingItem({ ...editingItem, name })}
                autoFocus
              />

              <TextInput
                style={styles.input}
                placeholder="Marca (opcional)"
                placeholderTextColor="#8888aa"
                value={editingItem?.brand || ''}
                onChangeText={(brand) => setEditingItem({ ...editingItem, brand })}
              />

              <Text style={styles.label}>Quantidade</Text>
              <TextInput
                style={styles.input}
                placeholder="Opcional até passar no caixa"
                placeholderTextColor="#8888aa"
                keyboardType="decimal-pad"
                value={editingItem?.quantity || ''}
                onChangeText={(quantity) => setEditingItem({ ...editingItem, quantity })}
              />

              <Text style={styles.label}>Unidade de compra</Text>
              <TouchableOpacity style={styles.unitField} onPress={() => openUnitPicker('edit')}>
                <Ionicons name="options-outline" size={20} color="#4CAF50" />
                <Text style={styles.unitFieldText}>{editingItem?.unit || 'un'}</Text>
                <Ionicons name="chevron-down" size={18} color="#aaaac0" />
              </TouchableOpacity>

              <Text style={styles.label}>Como informar o preço?</Text>
              <View style={styles.modeSelector}>
                <TouchableOpacity style={[styles.modeOption, editingItem?.priceMode === 'total' && styles.modeOptionActive]} onPress={() => setEditingItem({ ...editingItem, priceMode: 'total' })}>
                  <Text style={[styles.modeOptionText, editingItem?.priceMode === 'total' && styles.modeOptionTextActive]}>Valor total</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modeOption, editingItem?.priceMode === 'unit' && styles.modeOptionActive]} onPress={() => setEditingItem({ ...editingItem, priceMode: 'unit' })}>
                  <Text style={[styles.modeOptionText, editingItem?.priceMode === 'unit' && styles.modeOptionTextActive]}>Por {editingItem?.priceUnit || editingItem?.unit || 'un'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>{editingItem?.priceMode === 'unit' ? `Preço por ${editingItem?.priceUnit || editingItem?.unit || 'un'}` : 'Valor total pago'}</Text>
              <TextInput
                style={styles.input}
                placeholder="Opcional"
                placeholderTextColor="#8888aa"
                keyboardType="decimal-pad"
                value={formatMoneyDigits(editingItem?.priceDigits)}
                onChangeText={(value) => setEditingItem({ ...editingItem, priceDigits: onlyDigits(value) })}
              />

              <Text style={styles.label}>Categoria</Text>
              <TouchableOpacity style={styles.categoryField} onPress={() => openCategoryPicker('edit')}>
                <MaterialCommunityIcons name={CATEGORIES.find(category => category.id === editingItem?.category)?.icon || 'shape-outline'} size={20} color="#4CAF50" />
                <Text style={styles.categoryFieldText}>{CATEGORIES.find(category => category.id === editingItem?.category)?.name || 'Outros'}</Text>
                <Ionicons name="search-outline" size={18} color="#aaaac0" />
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEditedItem}>
                  <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Compra */}
      <Modal visible={purchaseModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registrar Compra</Text>
            <Text style={styles.purchaseProductName}>{selectedItem?.name}</Text>
            {selectedItem?.brand ? <Text style={styles.purchaseProductBrand}>{selectedItem.brand}</Text> : null}
            
            <Text style={styles.label}>{purchaseData.priceMode === 'unit' ? `Preço por ${purchaseData.priceUnit || purchaseData.unit}` : 'Valor total pago'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Opcional"
              placeholderTextColor="#8888aa"
              keyboardType="numeric"
              value={formatMoneyDigits(purchaseData.priceDigits)}
              onChangeText={(value) => setPurchaseData({ ...purchaseData, priceDigits: onlyDigits(value) })}
            />
            <Text style={styles.helperText}>{purchaseData.priceMode === 'unit' && purchaseData.unit !== purchaseData.priceUnit ? `Quantidade em ${purchaseData.unit} será convertida para ${purchaseData.priceUnit}. ` : ''}Opcional no planejamento. Digite só os números: 800 = R$ 8,00; 8 = R$ 0,08.</Text>
            {purchaseData.priceMode === 'unit' && purchaseData.priceDigits && purchaseData.quantity && (
              <Text style={styles.previewText}>
                Total estimado: R$ {getItemTotal({ price: parseMoneyDigits(purchaseData.priceDigits), priceMode: 'unit', priceIsTotal: false, quantity: parseQuantity(purchaseData.quantity), unit: purchaseData.unit, priceUnit: purchaseData.priceUnit }).toFixed(2).replace('.', ',')}
              </Text>
            )}
            
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder={`Quantidade (${purchaseData.unit})`}
                placeholderTextColor="#8888aa"
                keyboardType="decimal-pad"
                value={purchaseData.quantity}
                onChangeText={(text) => setPurchaseData({ ...purchaseData, quantity: text })}
              />
              <TouchableOpacity style={styles.unitFieldCompact} onPress={() => openUnitPicker('purchase')}>
                <Ionicons name="options-outline" size={18} color="#4CAF50" />
                <Text style={styles.unitButtonText}>{purchaseData.unit}</Text>
                <Ionicons name="chevron-down" size={14} color="#aaaac0" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.promotionRow}>
              <TouchableOpacity 
                style={[styles.promotionCheckbox, purchaseData.isPromotion && styles.promotionChecked]}
                onPress={() => setPurchaseData({...purchaseData, isPromotion: !purchaseData.isPromotion})}
              >
                {purchaseData.isPromotion && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
              <Text style={styles.promotionLabel}>Produto em Promoção</Text>
            </View>
            
            {purchaseData.isPromotion && (
              <TextInput
                style={styles.input}
                placeholder="Valor original total (opcional)"
                placeholderTextColor="#8888aa"
                keyboardType="numeric"
                value={formatMoneyDigits(purchaseData.originalPriceDigits)}
                onChangeText={(value) => setPurchaseData({ ...purchaseData, originalPriceDigits: onlyDigits(value) })}
              />
            )}
            
            {purchaseData.priceDigits && purchaseData.originalPriceDigits && purchaseData.quantity && (
              <View style={styles.savingsContainer}>
                <Text style={styles.savingsText}>
                  Economia: R$ {(
                    getItemTotal({ price: parseMoneyDigits(purchaseData.originalPriceDigits), priceMode: purchaseData.priceMode, priceIsTotal: purchaseData.priceMode !== 'unit', quantity: parseQuantity(purchaseData.quantity), unit: purchaseData.unit, priceUnit: purchaseData.priceUnit }) -
                    getItemTotal({ price: parseMoneyDigits(purchaseData.priceDigits), priceMode: purchaseData.priceMode, priceIsTotal: purchaseData.priceMode !== 'unit', quantity: parseQuantity(purchaseData.quantity), unit: purchaseData.unit, priceUnit: purchaseData.priceUnit })
                  ).toFixed(2).replace('.', ',')}
                </Text>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setPurchaseModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleConfirmPurchase}>
                <Text style={styles.saveButtonText}>Confirmar Compra</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Categorias */}
      <Modal visible={categoryPickerVisible} animationType="fade" transparent onRequestClose={closeCategoryPicker}>
        <View style={styles.modalOverlay}>
          <View style={styles.categoryModalContent}>
            <Text style={styles.modalTitle}>Escolher setor</Text>
            <TextInput
              style={styles.input}
              placeholder="Buscar categoria..."
              placeholderTextColor="#8888aa"
              value={categoryQuery}
              onChangeText={setCategoryQuery}
              autoFocus
            />
            {categoryPickerMode === 'filter' && (
              <TouchableOpacity
                style={[styles.categoryResult, !selectedCategory && styles.categoryResultSelected]}
                onPress={() => chooseCategory('todos')}
              >
                <Ionicons name="apps-outline" size={22} color="#4CAF50" />
                <Text style={styles.categoryResultText}>Todos os setores</Text>
                {!selectedCategory && <Ionicons name="checkmark-circle" size={21} color="#4CAF50" />}
              </TouchableOpacity>
            )}
            <ScrollView style={styles.categoryResults} keyboardShouldPersistTaps="handled">
              {filteredPickerCategories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryResult, pickerCategory === category.id && styles.categoryResultSelected]}
                  onPress={() => chooseCategory(category.id)}
                >
                  <MaterialCommunityIcons name={category.icon} size={22} color={category.color} />
                  <Text style={styles.categoryResultText}>{category.name}</Text>
                  {pickerCategory === category.id && <Ionicons name="checkmark-circle" size={21} color="#4CAF50" />}
                </TouchableOpacity>
              ))}
              {filteredPickerCategories.length === 0 && <Text style={styles.noResultsText}>Nenhuma categoria encontrada.</Text>}
            </ScrollView>
            <TouchableOpacity style={styles.cancelButton} onPress={closeCategoryPicker}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Unidades */}
      <Modal visible={unitModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar unidade</Text>
            <Text style={styles.modalSubtitle}>Escolhida: {unitPickerTarget === 'edit' ? editingItem?.unit : purchaseData.unit}</Text>
            <View style={styles.unitOptionsGrid}>
              {UNITS.map(unit => {
                const currentUnit = unitPickerTarget === 'edit' ? editingItem?.unit : purchaseData.unit;
                return (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.unitOption, currentUnit === unit && styles.unitOptionSelected]}
                    onPress={() => chooseUnit(unit)}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={currentUnit === unit ? '#fff' : '#55556a'} />
                    <Text style={[styles.unitOptionText, currentUnit === unit && styles.unitOptionTextSelected]}>{unit}</Text>
                    <Text style={[styles.unitOptionDescription, currentUnit === unit && styles.unitOptionTextSelected]}>
                      {unit === 'kg' ? 'quilo' : unit === 'g' ? 'grama' : unit === 'L' ? 'litro' : unit === 'mL' ? 'mililitro' : unit === 'dz' ? 'dúzia' : unit === 'un' ? 'unidade' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setUnitModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { padding: 16, backgroundColor: '#1a1a2e', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerCopy: { flex: 1, paddingRight: 12 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#8888aa', fontSize: 12, marginTop: 4 },
  headerActions: { alignItems: 'flex-end' },
  totalContainer: { alignItems: 'flex-end' },
  menuButton: { marginTop: 8, padding: 4 },
  totalLabel: { color: '#8888aa', marginRight: 8 },
  totalValue: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold' },
  mainSearchSection: { marginHorizontal: 16, marginTop: 16 },
  mainSearchField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a3e', borderRadius: 12, paddingHorizontal: 14, minHeight: 52 },
  mainSearchInput: { flex: 1, color: '#fff', fontSize: 16, marginLeft: 10, paddingVertical: 10 },
  mainSuggestionsList: { backgroundColor: '#1a1a2e', borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  mainSuggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 13, borderBottomWidth: 1, borderBottomColor: '#2f2f43' },
  mainSuggestionCopy: { flex: 1 },
  newProductSuggestion: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  newProductSuggestionText: { color: '#FFB74D', fontSize: 15, fontWeight: '600', marginLeft: 10 },
  roundSummary: { marginHorizontal: 16, marginTop: 14, marginBottom: 16, padding: 14, borderRadius: 12, backgroundColor: '#1d4c30', flexDirection: 'row', alignItems: 'center' },
  roundSummaryCopy: { flex: 1 },
  roundSummaryTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  roundSummaryText: { color: '#c9e9cf', fontSize: 12, marginTop: 3 },
  newRoundButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', paddingVertical: 9, paddingHorizontal: 11, borderRadius: 9 },
  newRoundButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  catalogHeader: { marginHorizontal: 16, marginTop: 8, marginBottom: 8, padding: 12, borderRadius: 10, backgroundColor: '#1a1a2e', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catalogHeaderCopy: { flex: 1, paddingRight: 10 },
  catalogHeaderAction: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catalogHelper: { color: '#8888aa', fontSize: 12, marginTop: 3 },
  catalogCount: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold', backgroundColor: '#1d4c30', minWidth: 30, textAlign: 'center', paddingVertical: 5, borderRadius: 14 },
  catalogEmptyFiltered: { color: '#8888aa', fontSize: 13, textAlign: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  listSectionBlock: { marginBottom: 14 },
  purchasedSectionBlock: { marginTop: 2 },
  listSectionHeader: { paddingHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listSectionCopy: { flex: 1, paddingRight: 12 },
  listSectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  listSectionHelper: { color: '#8888aa', fontSize: 12, marginTop: 3 },
  listSectionCount: { color: '#fff', fontSize: 14, fontWeight: 'bold', backgroundColor: '#b87816', minWidth: 28, textAlign: 'center', paddingVertical: 4, borderRadius: 14 },
  purchasedSectionCount: { backgroundColor: '#34783f' },
  emptyRoundHint: { marginHorizontal: 16, marginBottom: 14, padding: 12, borderRadius: 10, backgroundColor: '#2a2a3e', flexDirection: 'row', alignItems: 'center' },
  emptyRoundHintText: { flex: 1, color: '#c9c9d9', fontSize: 12, lineHeight: 17, marginLeft: 8 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  filterSection: { marginBottom: 12 },
  filterLabel: { color: '#aaaac0', fontSize: 13, fontWeight: '600', marginHorizontal: 16, marginBottom: 8 },
  categoryField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a3e', padding: 14, borderRadius: 10, marginHorizontal: 16, marginBottom: 12 },
  categoryFieldText: { flex: 1, color: '#fff', fontSize: 15, marginLeft: 10 },
  categoryModalContent: { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 24, margin: 20, maxHeight: '80%' },
  categoryResults: { maxHeight: 360, marginBottom: 12 },
  categoryResult: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#3a3a4e', padding: 13, borderRadius: 10, marginBottom: 8 },
  categoryResultSelected: { borderColor: '#4CAF50', backgroundColor: '#25253b' },
  categoryResultText: { flex: 1, color: '#fff', fontSize: 15, marginLeft: 12 },
  noResultsText: { color: '#8888aa', textAlign: 'center', padding: 20 },
  listScroll: { flex: 1 },
  listContent: { paddingBottom: 24 },
  undoBar: { marginHorizontal: 16, marginBottom: 10, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 10, backgroundColor: '#2a2a3e', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  undoBarText: { flex: 1, color: '#d7d7e4', fontSize: 12, marginRight: 10 },
  undoActionText: { color: '#FFB74D', fontSize: 13, fontWeight: 'bold' },
  itemCard: { backgroundColor: '#1a1a2e', padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  itemPurchased: { opacity: 0.7 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  itemBrand: { color: '#8888aa', fontSize: 14 },
  itemCategory: { color: '#8888aa', fontSize: 12, marginTop: 2 },
  catalogStatus: { color: '#FFB74D', fontSize: 12, marginTop: 4, fontWeight: '600' },
  catalogStatusPurchased: { color: '#81C784' },
  itemQuantity: { color: '#c0c0d0', fontSize: 12, marginTop: 2 },
  itemReferencePrice: { color: '#b9c7bd', fontSize: 12, marginTop: 4 },
  itemPrice: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  itemPendingPrice: { color: '#FFB74D', fontSize: 12, marginTop: 4 },
  itemTextPurchased: { textDecorationLine: 'line-through' },
  promotionBadge: { backgroundColor: '#FF9800', color: '#fff', fontSize: 10, paddingHorizontal: 4, borderRadius: 4, marginLeft: 4 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  checkButtonActive: { backgroundColor: '#4CAF50' },
  catalogCheckButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  catalogCheckButtonActive: { backgroundColor: '#4CAF50' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#fff', fontSize: 18, marginTop: 16 },
  emptySubtext: { color: '#8888aa', fontSize: 14, marginTop: 8, textAlign: 'center' },
  filteredEmptyContainer: { padding: 32, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 12 },
  menuContent: { width: 250, backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  menuTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2f2f43' },
  menuItemText: { color: '#fff', fontSize: 15, marginLeft: 12 },
  menuCloseButton: { backgroundColor: '#2a2a3e', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 14 },
  modalContent: { backgroundColor: '#1a1a2e', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  formModalContent: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  modalScrollContent: { padding: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalSubtitle: { color: '#8888aa', fontSize: 13, textAlign: 'center', marginTop: -8, marginBottom: 16 },
  purchaseProductName: { color: '#4CAF50', fontSize: 18, textAlign: 'center', marginBottom: 4 },
  purchaseProductBrand: { color: '#8888aa', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  input: { backgroundColor: '#2a2a3e', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 12 },
  helperText: { color: '#8888aa', fontSize: 12, lineHeight: 17, marginTop: -6, marginBottom: 12 },
  previewText: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold', marginTop: -4, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  fieldColumn: { marginBottom: 12 },
  halfField: { flex: 1 },
  leftField: { marginRight: 8 },
  unitField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a3e', padding: 14, borderRadius: 10, marginBottom: 14 },
  unitFieldText: { flex: 1, color: '#fff', fontSize: 16, marginLeft: 10, fontWeight: 'bold' },
  unitFieldCompact: { flexDirection: 'row', backgroundColor: '#2a2a3e', padding: 12, borderRadius: 8, justifyContent: 'center', minWidth: 96, alignItems: 'center', gap: 5 },
  unitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modeSelector: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeOption: { flex: 1, padding: 12, borderRadius: 9, borderWidth: 1, borderColor: '#3a3a4e', alignItems: 'center', backgroundColor: '#2a2a3e' },
  modeOptionActive: { borderColor: '#4CAF50', backgroundColor: '#1d4c30' },
  modeOptionText: { color: '#aaaac0', fontSize: 14 },
  modeOptionTextActive: { color: '#fff', fontWeight: 'bold' },
  promotionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  promotionCheckbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  promotionChecked: { backgroundColor: '#4CAF50' },
  promotionLabel: { color: '#fff', fontSize: 16 },
  savingsContainer: { backgroundColor: '#2a4a2e', padding: 12, borderRadius: 8, marginBottom: 12 },
  savingsText: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: { flex: 1, backgroundColor: '#2a2a3e', padding: 16, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontSize: 16 },
  saveButton: { flex: 1, backgroundColor: '#4CAF50', padding: 16, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  suggestionsList: { maxHeight: 150, backgroundColor: '#2a2a3e', borderRadius: 8, marginBottom: 12 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#3a3a4e' },
  suggestionName: { color: '#fff', fontSize: 16 },
  suggestionBrand: { color: '#8888aa', fontSize: 14 },
  label: { color: '#fff', fontSize: 14, marginBottom: 8 },
  categorySelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#2a2a3e', borderRadius: 20 },
  categoryChipText: { color: '#fff', fontSize: 14 },
  unitOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  unitOption: { width: '31%', minHeight: 70, padding: 10, backgroundColor: '#2a2a3e', borderRadius: 10, marginBottom: 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3a3a4e' },
  unitOptionSelected: { backgroundColor: '#4CAF50', borderColor: '#8fe6a1' },
  unitOptionText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  unitOptionDescription: { color: '#8888aa', fontSize: 10, marginTop: 2 },
  unitOptionTextSelected: { color: '#fff', fontWeight: 'bold' },
});
