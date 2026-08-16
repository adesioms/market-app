import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getShoppingList, addToShoppingList, updateShoppingItem, removeFromShoppingList, markAsPurchased, searchSuggestions, getPurchaseDefaults, getItemTotal, CATEGORIES, UNITS } from '../utils/storage';

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

export default function ShoppingListScreen() {
  const [shoppingList, setShoppingList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', brand: '', category: 'outros' });
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [purchaseData, setPurchaseData] = useState({ priceDigits: '', quantity: '1', unit: 'un', isPromotion: false, originalPriceDigits: '' });
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const loadList = useCallback(async () => {
    const list = await getShoppingList();
    setShoppingList(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [loadList])
  );

  const handleOpenAddItem = () => {
    setNewItem({ name: '', brand: '', category: 'outros' });
    setSearchQuery('');
    setSuggestions([]);
    setModalVisible(true);
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
    setEditingItem({
      id: item.id,
      name: item.name || '',
      brand: item.brand || '',
      category: item.category || 'outros',
      quantity: String(item.quantity ?? getPurchaseDefaults(item.category).quantity),
      unit: item.unit || getPurchaseDefaults(item.category).unit,
      priceDigits: moneyDigitsFromValue(item.price)
    });
    setEditModalVisible(true);
  };

  const handleSaveEditedItem = async () => {
    const name = editingItem?.name.trim();
    if (!name) {
      Alert.alert('Erro', 'Digite o nome do produto');
      return;
    }

    const quantity = Number.parseFloat(String(editingItem.quantity || '').replace(',', '.'));
    if (!quantity || quantity <= 0) {
      Alert.alert('Erro', 'Informe uma quantidade válida');
      return;
    }

    const saved = await updateShoppingItem(editingItem.id, {
      name,
      brand: editingItem.brand.trim(),
      category: editingItem.category,
      quantity,
      unit: editingItem.unit,
      price: parseMoneyDigits(editingItem.priceDigits),
      priceIsTotal: true
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
    setPurchaseData({
      priceDigits: moneyDigitsFromValue(item.price),
      quantity: String(item.quantity ?? defaults.quantity),
      unit,
      isPromotion: Boolean(item.isPromotion),
      originalPriceDigits: moneyDigitsFromValue(item.originalPrice)
    });
    setPurchaseModalVisible(true);
  };

  const handleConfirmPurchase = async () => {
    const quantity = Number.parseFloat(String(purchaseData.quantity || '').replace(',', '.'));
    if (!quantity || quantity <= 0) {
      Alert.alert('Erro', 'Digite uma quantidade válida');
      return;
    }

    const purchased = await markAsPurchased(selectedItem.id, {
      price: parseMoneyDigits(purchaseData.priceDigits),
      priceIsTotal: true,
      quantity,
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
              <Text style={styles.itemPrice}>
                R$ {total.toFixed(2).replace('.', ',')}
                {item.isPromotion && <Text style={styles.promotionBadge}> PROMO</Text>}
              </Text>
            ) : (
              <Text style={styles.itemPendingPrice}>Preço a informar no caixa</Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.itemActions}>
          {item.status === 'pending' ? (
            <TouchableOpacity
              accessibilityLabel={`Registrar compra de ${item.name}`}
              style={styles.buyButton}
              onPress={() => handleOpenPurchase(item)}
            >
              <Ionicons name="cart" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          )}
          <TouchableOpacity accessibilityLabel={`Remover ${item.name}`} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent} nestedScrollEnabled>
      {/* Header com Total */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lista de Compras</Text>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total informado:</Text>
          <Text style={styles.totalValue}>R$ {calculateTotal().toFixed(2).replace('.', ',')}</Text>
        </View>
      </View>

      {/* Botão Adicionar */}
      <TouchableOpacity style={styles.addButton} onPress={handleOpenAddItem}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Adicionar Item</Text>
      </TouchableOpacity>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Organizar por setor</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Ionicons name="apps-outline" size={16} color={!selectedCategory ? '#fff' : '#aaaac0'} />
            <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {CATEGORIES.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[styles.filterChip, selectedCategory === category.id && { backgroundColor: category.color }]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <MaterialCommunityIcons name={category.icon} size={16} color={selectedCategory === category.id ? '#fff' : '#aaaac0'} />
              <Text style={[styles.filterChipText, selectedCategory === category.id && styles.filterChipTextActive]}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista Pendentes */}
      {pendingItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pendentes ({pendingItems.length})</Text>
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
            
            <View style={styles.categorySelector}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, newItem.category === cat.id && { backgroundColor: cat.color }]}
                  onPress={() => setNewItem({...newItem, category: cat.id})}
                >
                  <MaterialCommunityIcons name={cat.icon} size={16} color="#fff" />
                  <Text style={styles.categoryChipText}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
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

              <View style={styles.row}>
                <View style={[styles.fieldColumn, styles.halfField, styles.leftField]}>
                  <Text style={styles.label}>Quantidade</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    placeholderTextColor="#8888aa"
                    keyboardType="decimal-pad"
                    value={editingItem?.quantity || ''}
                    onChangeText={(quantity) => setEditingItem({ ...editingItem, quantity })}
                  />
                </View>
                <View style={[styles.fieldColumn, styles.halfField]}>
                  <Text style={styles.label}>Valor total (R$)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Opcional"
                    placeholderTextColor="#8888aa"
                    keyboardType="decimal-pad"
                    value={formatMoneyDigits(editingItem?.priceDigits)}
                    onChangeText={(value) => setEditingItem({ ...editingItem, priceDigits: onlyDigits(value) })}
                  />
                </View>
              </View>

              <Text style={styles.label}>Unidade</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitsScroll}>
                <View style={styles.unitsContainer}>
                  {UNITS.map(unit => (
                    <TouchableOpacity
                      key={unit}
                      style={[styles.unitChip, editingItem?.unit === unit && styles.unitChipActive]}
                      onPress={() => setEditingItem({ ...editingItem, unit })}
                    >
                      <Text style={[styles.unitChipText, editingItem?.unit === unit && styles.unitChipTextActive]}>{unit}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>Categoria</Text>
              <View style={styles.categorySelector}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, editingItem?.category === cat.id && { backgroundColor: cat.color }]}
                    onPress={() => setEditingItem({ ...editingItem, category: cat.id })}
                  >
                    <MaterialCommunityIcons name={cat.icon} size={16} color="#fff" />
                    <Text style={styles.categoryChipText}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

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
            
            <TextInput
              style={styles.input}
              placeholder="Valor total pago (opcional)"
              placeholderTextColor="#8888aa"
              keyboardType="numeric"
              value={formatMoneyDigits(purchaseData.priceDigits)}
              onChangeText={(value) => setPurchaseData({ ...purchaseData, priceDigits: onlyDigits(value) })}
            />
            <Text style={styles.helperText}>Opcional no planejamento. Digite só os números: 800 = R$ 8,00; 8 = R$ 0,08.</Text>
            
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder={`Quantidade (${purchaseData.unit})`}
                placeholderTextColor="#8888aa"
                keyboardType="numeric"
                value={purchaseData.quantity}
                onChangeText={(text) => setPurchaseData({...purchaseData, quantity: text})}
              />
              <TouchableOpacity style={styles.unitButton} onPress={() => setUnitModalVisible(true)}>
                <Text style={styles.unitButtonText}>{purchaseData.unit}</Text>
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
            
            {purchaseData.priceDigits && purchaseData.originalPriceDigits && (
              <View style={styles.savingsContainer}>
                <Text style={styles.savingsText}>
                  Economia: R$ {((parseMoneyDigits(purchaseData.originalPriceDigits) || 0) - (parseMoneyDigits(purchaseData.priceDigits) || 0)).toFixed(2).replace('.', ',')}
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

      {/* Modal Unidades */}
      <Modal visible={unitModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar Unidade</Text>
            {UNITS.map(unit => (
              <TouchableOpacity
                key={unit}
                style={[styles.unitOption, purchaseData.unit === unit && styles.unitOptionSelected]}
                onPress={() => {
                  setPurchaseData({...purchaseData, unit});
                  setUnitModalVisible(false);
                }}
              >
                <Text style={[styles.unitOptionText, purchaseData.unit === unit && styles.unitOptionTextSelected]}>
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
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
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  totalContainer: { flexDirection: 'row', alignItems: 'center' },
  totalLabel: { color: '#8888aa', marginRight: 8 },
  totalValue: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold' },
  addButton: { margin: 16, flexDirection: 'row', backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  filterSection: { marginBottom: 12 },
  filterLabel: { color: '#aaaac0', fontSize: 13, fontWeight: '600', marginHorizontal: 16, marginBottom: 8 },
  filterScrollContent: { paddingHorizontal: 16, paddingBottom: 2 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a3e', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  filterChipActive: { backgroundColor: '#4CAF50' },
  filterChipText: { color: '#aaaac0', fontSize: 12, marginLeft: 5 },
  filterChipTextActive: { color: '#fff', fontWeight: 'bold' },
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
  itemPrice: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  itemPendingPrice: { color: '#FFB74D', fontSize: 12, marginTop: 4 },
  itemTextPurchased: { textDecorationLine: 'line-through' },
  promotionBadge: { backgroundColor: '#FF9800', color: '#fff', fontSize: 10, paddingHorizontal: 4, borderRadius: 4, marginLeft: 4 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buyButton: { backgroundColor: '#4CAF50', padding: 8, borderRadius: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#fff', fontSize: 18, marginTop: 16 },
  emptySubtext: { color: '#8888aa', fontSize: 14, marginTop: 8, textAlign: 'center' },
  filteredEmptyContainer: { padding: 32, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a2e', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  formModalContent: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  modalScrollContent: { padding: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  purchaseProductName: { color: '#4CAF50', fontSize: 18, textAlign: 'center', marginBottom: 4 },
  purchaseProductBrand: { color: '#8888aa', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  input: { backgroundColor: '#2a2a3e', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 12 },
  helperText: { color: '#8888aa', fontSize: 12, lineHeight: 17, marginTop: -6, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  fieldColumn: { marginBottom: 12 },
  halfField: { flex: 1 },
  leftField: { marginRight: 8 },
  unitButton: { backgroundColor: '#2a2a3e', padding: 12, borderRadius: 8, justifyContent: 'center', minWidth: 80, alignItems: 'center' },
  unitButtonText: { color: '#fff', fontSize: 16 },
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
  unitOption: { padding: 16, backgroundColor: '#2a2a3e', borderRadius: 8, marginBottom: 8, alignItems: 'center' },
  unitOptionSelected: { backgroundColor: '#4CAF50' },
  unitOptionText: { color: '#fff', fontSize: 16 },
  unitOptionTextSelected: { fontWeight: 'bold' },
});
