import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getShoppingList, addToShoppingList, updateShoppingItem, removeFromShoppingList, markAsPurchased, unmarkAsPurchased, migrateToUnifiedList, searchSuggestions, getPurchaseDefaults, getDefaultPriceUnit, getItemTotal, CATEGORIES, UNITS, WEIGHT_VOLUME_UNITS } from '../utils/storage';

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
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', brand: '', category: 'outros' });
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
    setShoppingList(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [loadList])
  );

  const handleOpenAddItem = (initialName = '') => {
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
      category: suggestion.category || 'outros'
    });
    if (!added) {
      Alert.alert('Erro', 'Não foi possível adicionar o produto. Tente novamente.');
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

    const addedItem = await addToShoppingList({
      name,
      brand: newItem.brand.trim(),
      category: newItem.category
    });

    if (!addedItem) {
      Alert.alert('Erro', 'Não foi possível adicionar o produto. Tente novamente.');
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
    Alert.alert('Confirmar', 'Remover este item?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        await removeFromShoppingList(id);
        loadList();
      }}
    ]);
  };

  const calculateTotal = () => shoppingList
    .filter(item => item.status === 'purchased')
    .reduce((total, item) => total + getItemTotal(item), 0);

  const categoryOrder = CATEGORIES.reduce((order, category, index) => ({ ...order, [category.id]: index }), {});
  const filteredItems = [...(selectedCategory
    ? shoppingList.filter(item => item.category === selectedCategory)
    : shoppingList)].sort((first, second) => {
      const categoryDifference = (categoryOrder[first.category] ?? 999) - (categoryOrder[second.category] ?? 999);
      return categoryDifference || String(first.name || '').localeCompare(String(second.name || ''), 'pt-BR');
    });
  const pendingItems = filteredItems.filter(item => item.status === 'pending');
  const purchasedItems = filteredItems.filter(item => item.status === 'purchased');
  const allItemsPurchased = shoppingList.length > 0 && shoppingList.every(item => item.status === 'purchased');

  const renderItem = ({ item }) => {
    const category = CATEGORIES.find(c => c.id === item.category);
    const total = getItemTotal(item);

    return (
      <View style={[styles.itemCard, item.status === 'purchased' && styles.itemPurchased]}>
        <TouchableOpacity
          accessibilityLabel={`Editar ${item.name}`}
          style={styles.itemLeft}
          onPress={() => handleOpenEditItem(item)}
        >
          <View style={[styles.itemIcon, { backgroundColor: category?.color || '#9E9E9E' }]}>
            <MaterialCommunityIcons name={category?.icon || 'shape-outline'} size={20} color="#fff" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, item.status === 'purchased' && styles.itemTextPurchased]}>
              {item.name}
            </Text>
            {item.brand ? (
              <Text style={[styles.itemBrand, item.status === 'purchased' && styles.itemTextPurchased]}>
                {item.brand}
              </Text>
            ) : null}
            <Text style={styles.itemCategory}>{category?.name || 'Outros'}</Text>
            <Text style={styles.itemQuantity}>{item.quantity || 1} {item.unit || 'un'}</Text>
            {item.price !== null && item.price !== undefined ? (
              <>
                {item.priceMode === 'unit' && (
                  <Text style={styles.itemReferencePrice}>R$ {Number(item.price).toFixed(2).replace('.', ',')} / {item.priceUnit || item.unit || 'un'}</Text>
                )}
                <Text style={styles.itemPrice}>
                  {item.priceMode === 'unit' ? `Total estimado: R$ ${total.toFixed(2).replace('.', ',')}` : `R$ ${total.toFixed(2).replace('.', ',')}`}
                  {item.isPromotion && <Text style={styles.promotionBadge}> PROMO</Text>}
                </Text>
              </>
            ) : (
              <Text style={styles.itemPendingPrice}>Preço a informar no caixa</Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.itemActions}>
          <TouchableOpacity
            accessibilityLabel={item.status === 'pending' ? `Marcar ${item.name} como comprado` : `Desmarcar ${item.name} como comprado`}
            style={[styles.checkButton, item.status === 'purchased' && styles.checkButtonActive]}
            onPress={() => handleTogglePurchased(item)}
          >
            <Ionicons
              name={item.status === 'purchased' ? 'checkmark' : 'checkmark-outline'}
              size={22}
              color={item.status === 'purchased' ? '#fff' : '#4CAF50'}
            />
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel={`Remover ${item.name}`} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#F44336" />
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
          <Text style={styles.headerTitle}>Minha Lista</Text>
          <Text style={styles.headerSubtitle}>Marque o que você já comprou</Text>
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
            placeholder="O que você precisa comprar?"
            placeholderTextColor="#8888aa"
            value={mainSearchQuery}
            onChangeText={handleMainSearch}
            returnKeyType="search"
          />
          {mainSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setMainSearchQuery(''); setMainSuggestions([]); }}>
              <Ionicons name="close-circle" size={20} color="#8888aa" />
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

      <TouchableOpacity style={styles.addButton} onPress={() => handleOpenAddItem()}>
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.addButtonText}>Cadastrar produto manualmente</Text>
      </TouchableOpacity>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Organizar por setor</Text>
        <TouchableOpacity style={styles.categoryField} onPress={() => openCategoryPicker('filter')}>
          <Ionicons name="search-outline" size={20} color="#4CAF50" />
          <Text style={styles.categoryFieldText}>
            {selectedCategory ? CATEGORIES.find(category => category.id === selectedCategory)?.name : 'Todos os setores'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#aaaac0" />
        </TouchableOpacity>
      </View>

      {allItemsPurchased && !selectedCategory && (
        <View style={styles.completionBanner}>
          <View style={styles.completionIcon}>
            <Ionicons name="checkmark" size={22} color="#fff" />
          </View>
          <View style={styles.completionCopy}>
            <Text style={styles.completionTitle}>Você concluiu esta rodada</Text>
            <Text style={styles.completionText}>Para comprar mais coisas, adicione novos produtos à mesma lista.</Text>
          </View>
          <TouchableOpacity style={styles.completionButton} onPress={() => handleOpenAddItem()}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Lista Pendentes */}
      {pendingItems.length > 0 && (
        <View style={styles.section}>
                      <Text style={styles.sectionTitle}>A comprar ({pendingItems.length})</Text>

          <FlatList
            data={pendingItems}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Lista Comprados */}
      {purchasedItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comprados ({purchasedItems.length})</Text>
          <FlatList
            data={purchasedItems}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      {shoppingList.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#8888aa" />
          <Text style={styles.emptyText}>Sua lista está vazia</Text>
          <Text style={styles.emptySubtext}>Adicione itens para começar</Text>
        </View>
      )}

      {shoppingList.length > 0 && filteredItems.length === 0 && (
        <View style={styles.filteredEmptyContainer}>
          <Ionicons name="filter-outline" size={40} color="#8888aa" />
          <Text style={styles.emptyText}>Nenhum item neste setor</Text>
          <Text style={styles.emptySubtext}>Escolha outro setor para ver os produtos.</Text>
        </View>
      )}

      </ScrollView>

      {/* Menu sanduíche */}
      <Modal visible={menuVisible} animationType="fade" transparent onRequestClose={() => setMenuVisible(false)}>
        <View style={[styles.menuOverlay, { paddingTop: insets.top + 8 }]}>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Mais opções</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert('Como usar', 'Adicione produtos pela busca, toque em um item para editar e marque o check quando terminar a compra. Produtos já cadastrados aparecem como sugestões para evitar duplicatas.');
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
            <Text style={styles.modalTitle}>Adicionar à Lista</Text>
            
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
                <Text style={styles.saveButtonText}>Salvar</Text>
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
  addButton: { margin: 16, flexDirection: 'row', backgroundColor: '#4CAF50', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  completionBanner: { marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 12, backgroundColor: '#1d4c30', flexDirection: 'row', alignItems: 'center' },
  completionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  completionCopy: { flex: 1, paddingRight: 8 },
  completionTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  completionText: { color: '#c9e9cf', fontSize: 12, lineHeight: 17, marginTop: 2 },
  completionButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
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
  itemCard: { backgroundColor: '#1a1a2e', padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  itemPurchased: { opacity: 0.7 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  itemBrand: { color: '#8888aa', fontSize: 14 },
  itemCategory: { color: '#8888aa', fontSize: 12, marginTop: 2 },
  itemQuantity: { color: '#c0c0d0', fontSize: 12, marginTop: 2 },
  itemReferencePrice: { color: '#b9c7bd', fontSize: 12, marginTop: 4 },
  itemPrice: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  itemPendingPrice: { color: '#FFB74D', fontSize: 12, marginTop: 4 },
  itemTextPurchased: { textDecorationLine: 'line-through' },
  promotionBadge: { backgroundColor: '#FF9800', color: '#fff', fontSize: 10, paddingHorizontal: 4, borderRadius: 4, marginLeft: 4 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  checkButtonActive: { backgroundColor: '#4CAF50' },
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
