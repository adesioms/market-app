import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getShoppingList, addToShoppingList, removeFromShoppingList, markAsPurchased, searchSuggestions, CATEGORIES, UNITS } from '../utils/storage';

export default function ShoppingListScreen() {
  const [shoppingList, setShoppingList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', brand: '', category: 'outros' });
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [purchaseData, setPurchaseData] = useState({ price: '', quantity: '1', unit: 'un', isPromotion: false, originalPrice: '' });
  const [unitModalVisible, setUnitModalVisible] = useState(false);

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

  const handleOpenPurchase = (item) => {
    setSelectedItem(item);
    setPurchaseData({ price: '', quantity: '1', unit: 'un', isPromotion: false, originalPrice: '' });
    setPurchaseModalVisible(true);
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseData.price || parseFloat(purchaseData.price) <= 0) {
      Alert.alert('Erro', 'Digite um preço válido');
      return;
    }
    
    await markAsPurchased(selectedItem.id, {
      price: parseFloat(purchaseData.price),
      quantity: parseFloat(purchaseData.quantity) || 1,
      unit: purchaseData.unit,
      isPromotion: purchaseData.isPromotion,
      originalPrice: purchaseData.isPromotion ? parseFloat(purchaseData.originalPrice) : null
    });
    
    setPurchaseModalVisible(false);
    loadList();
    Alert.alert('Sucesso', 'Produto marcado como comprado!');
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

  const calculateTotal = () => {
    let total = 0;
    shoppingList.forEach(item => {
      if (item.status === 'purchased' && item.price && item.quantity) {
        total += item.price * item.quantity;
      }
    });
    return total;
  };

  const pendingItems = shoppingList.filter(item => item.status === 'pending');
  const purchasedItems = shoppingList.filter(item => item.status === 'purchased');

  const renderCategoryIcon = (categoryId) => {
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat ? cat.icon : 'grid';
  };

  const renderItem = ({ item }) => (
    <View style={[styles.itemCard, item.status === 'purchased' && styles.itemPurchased]}>
      <View style={styles.itemLeft}>
        <View style={[styles.itemIcon, { backgroundColor: CATEGORIES.find(c => c.id === item.category)?.color || '#9E9E9E' }]}>
          <Ionicons name={renderCategoryIcon(item.category)} size={20} color="#fff" />
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, item.status === 'purchased' && styles.itemTextPurchased]}>
            {item.name}
          </Text>
          {item.brand && (
            <Text style={[styles.itemBrand, item.status === 'purchased' && styles.itemTextPurchased]}>
              {item.brand}
            </Text>
          )}
          {item.status === 'purchased' && item.price && (
            <Text style={styles.itemPrice}>
              R$ {(item.price * item.quantity).toFixed(2)}
              {item.isPromotion && <Text style={styles.promotionBadge}> PROMO</Text>}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.itemActions}>
        {item.status === 'pending' ? (
          <TouchableOpacity style={styles.buyButton} onPress={() => handleOpenPurchase(item)}>
            <Ionicons name="cart" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        )}
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header com Total */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lista de Compras</Text>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>R$ {calculateTotal().toFixed(2)}</Text>
        </View>
      </View>

      {/* Botão Adicionar */}
      <TouchableOpacity style={styles.addButton} onPress={handleOpenAddItem}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Adicionar Item</Text>
      </TouchableOpacity>

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

      {/* Modal Adicionar Item */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
          </View>
        </View>
      </Modal>

      {/* Modal Compra */}
      <Modal visible={purchaseModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registrar Compra</Text>
            <Text style={styles.purchaseProductName}>{selectedItem?.name}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Preço (R$)"
              placeholderTextColor="#8888aa"
              keyboardType="numeric"
              value={purchaseData.price}
              onChangeText={(text) => setPurchaseData({...purchaseData, price: text})}
            />
            
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Quantidade"
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
                placeholder="Preço Original (R$)"
                placeholderTextColor="#8888aa"
                keyboardType="numeric"
                value={purchaseData.originalPrice}
                onChangeText={(text) => setPurchaseData({...purchaseData, originalPrice: text})}
              />
            )}
            
            {purchaseData.price && purchaseData.quantity && purchaseData.originalPrice && (
              <View style={styles.savingsContainer}>
                <Text style={styles.savingsText}>
                  Economia: R$ {((parseFloat(purchaseData.originalPrice) - parseFloat(purchaseData.price)) * parseFloat(purchaseData.quantity)).toFixed(2)}
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
  itemCard: { backgroundColor: '#1a1a2e', padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  itemPurchased: { opacity: 0.7 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  itemBrand: { color: '#8888aa', fontSize: 14 },
  itemPrice: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  itemTextPurchased: { textDecorationLine: 'line-through' },
  promotionBadge: { backgroundColor: '#FF9800', color: '#fff', fontSize: 10, paddingHorizontal: 4, borderRadius: 4, marginLeft: 4 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buyButton: { backgroundColor: '#4CAF50', padding: 8, borderRadius: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#fff', fontSize: 18, marginTop: 16 },
  emptySubtext: { color: '#8888aa', fontSize: 14, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a2e', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  purchaseProductName: { color: '#4CAF50', fontSize: 18, textAlign: 'center', marginBottom: 16 },
  input: { backgroundColor: '#2a2a3e', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
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
  categorySelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  categoryChip: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#2a2a3e', borderRadius: 20 },
  categoryChipText: { color: '#fff', fontSize: 14 },
  unitOption: { padding: 16, backgroundColor: '#2a2a3e', borderRadius: 8, marginBottom: 8, alignItems: 'center' },
  unitOptionSelected: { backgroundColor: '#4CAF50' },
  unitOptionText: { color: '#fff', fontSize: 16 },
  unitOptionTextSelected: { fontWeight: 'bold' },
});
