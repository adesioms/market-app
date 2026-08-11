import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CATEGORIES = [
  { id: 'hortifruti', name: 'Hortifruti', icon: 'leaf', color: '#4CAF50' },
  { id: 'carnes', name: 'Carnes', icon: 'restaurant', color: '#F44336' },
  { id: 'laticinios', name: 'Laticínios', icon: 'wine', color: '#FF9800' },
  { id: 'padaria', name: 'Padaria', icon: 'pizza', color: '#FFC107' },
  { id: 'bebidas', name: 'Bebidas', icon: 'beer', color: '#2196F3' },
  { id: 'limpeza', name: 'Limpeza', icon: 'water', color: '#00BCD4' },
  { id: 'higiene', name: 'Higiene', icon: 'body', color: '#E91E63' },
  { id: 'outros', name: 'Outros', icon: 'grid', color: '#9E9E9E' },
];

const UNITS = ['un', 'kg', 'g', 'L', 'mL', 'm'];

export default function ShoppingList({ navigation }) {
  const [shoppingList, setShoppingList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemName, setItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('outros');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  
  // Purchase modal states
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selectedUnit, setSelectedUnit] = useState('un');
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [isDiscount, setIsDiscount] = useState(false);
  const [originalPrice, setOriginalPrice] = useState('');

  useEffect(() => {
    loadShoppingList();
  }, []);

  const loadShoppingList = async () => {
    try {
      const stored = await AsyncStorage.getItem('@mercado:shoppingList');
      if (stored) {
        setShoppingList(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erro ao carregar lista:', error);
    }
  };

  const saveShoppingList = async (list) => {
    try {
      await AsyncStorage.setItem('@mercado:shoppingList', JSON.stringify(list));
      setShoppingList(list);
    } catch (error) {
      console.error('Erro ao salvar lista:', error);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setItemName('');
    setSelectedCategory('outros');
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemName(item.name);
    setSelectedCategory(item.category);
    setModalVisible(true);
  };

  const handleSaveItem = () => {
    if (!itemName.trim()) {
      Alert.alert('Atenção', 'Digite o nome do produto');
      return;
    }

    if (editingItem) {
      const updated = shoppingList.map(item =>
        item.id === editingItem.id
          ? { ...item, name: itemName, category: selectedCategory }
          : item
      );
      saveShoppingList(updated);
    } else {
      const newItem = {
        id: Date.now().toString(),
        name: itemName,
        category: selectedCategory,
        purchased: false,
        createdAt: new Date().toISOString(),
      };
      saveShoppingList([...shoppingList, newItem]);
    }

    setModalVisible(false);
    setItemName('');
    setSelectedCategory('outros');
  };

  const handleDeleteItem = (id) => {
    Alert.alert(
      'Excluir item',
      'Tem certeza que deseja remover este item da lista?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            const updated = shoppingList.filter(item => item.id !== id);
            saveShoppingList(updated);
          },
        },
      ]
    );
  };

  const openPurchaseModal = (item) => {
    setCurrentItem(item);
    setPrice('');
    setQuantity('1');
    setSelectedUnit('un');
    setIsDiscount(false);
    setOriginalPrice('');
    setPurchaseModalVisible(true);
  };

  const handleConfirmPurchase = async () => {
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Atenção', 'Digite um preço válido');
      return;
    }

    const qty = parseFloat(quantity) || 1;
    const finalPrice = parseFloat(price);
    const discountInfo = isDiscount && originalPrice 
      ? { isDiscount: true, originalPrice: parseFloat(originalPrice) }
      : { isDiscount: false, originalPrice: null };

    // Create purchase record
    const purchaseRecord = {
      id: Date.now().toString(),
      name: currentItem.name,
      price: finalPrice,
      quantity: qty,
      unit: selectedUnit,
      total: finalPrice * qty,
      category: currentItem.category,
      date: new Date().toISOString(),
      ...discountInfo,
    };

    // Save to purchases history
    try {
      const storedPurchases = await AsyncStorage.getItem('@mercado:purchases');
      const purchases = storedPurchases ? JSON.parse(storedPurchases) : [];
      await AsyncStorage.setItem('@mercado:purchases', JSON.stringify([purchaseRecord, ...purchases]));
    } catch (error) {
      console.error('Erro ao salvar compra:', error);
    }

    // Update shopping list - mark as purchased or remove
    const updated = shoppingList.map(item =>
      item.id === currentItem.id ? { ...item, purchased: true } : item
    );
    saveShoppingList(updated);

    setPurchaseModalVisible(false);
    Alert.alert(
      'Sucesso!',
      `Produto "${currentItem.name}" registrado com sucesso!\nTotal: R$ ${(finalPrice * qty).toFixed(2)}`,
      [{ text: 'OK' }]
    );
    
    // Navigate to dashboard to see updated totals
    setTimeout(() => {
      navigation.navigate('Dashboard');
    }, 1500);
  };

  const getCategoryInfo = (catId) => {
    return CATEGORIES.find(c => c.id === catId) || CATEGORIES[7];
  };

  const renderShoppingItem = ({ item }) => {
    const category = getCategoryInfo(item.category);
    
    return (
      <TouchableOpacity
        style={[styles.itemCard, item.purchased && styles.itemCardPurchased]}
        onPress={() => item.purchased ? openEditModal(item) : openPurchaseModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
            <Ionicons name={category.icon} size={20} color={category.color} />
          </View>
          <View style={styles.itemTextContainer}>
            <Text style={[styles.itemName, item.purchased && styles.itemNamePurchased]}>
              {item.name}
            </Text>
            <Text style={styles.itemCategory}>{category.name}</Text>
          </View>
        </View>
        
        <View style={styles.itemActions}>
          {item.purchased ? (
            <TouchableOpacity
              style={styles.checkButtonCompleted}
              onPress={() => openEditModal(item)}
            >
              <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.checkButton}
              onPress={() => openPurchaseModal(item)}
            >
              <Ionicons name="cart-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const pendingCount = shoppingList.filter(i => !i.purchased).length;
  const purchasedCount = shoppingList.filter(i => i.purchased).length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lista de Compras</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statBadge}>
            <Ionicons name="hourglass-outline" size={16} color="#FFA726" />
            <Text style={styles.statText}>{pendingCount} pendentes</Text>
          </View>
          <View style={styles.statBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.statText}>{purchasedCount} comprados</Text>
          </View>
        </View>
      </View>

      {shoppingList.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={80} color="#333" />
          <Text style={styles.emptyTitle}>Sua lista está vazia</Text>
          <Text style={styles.emptySubtitle}>
            Adicione itens que você precisa comprar no mercado
          </Text>
          <TouchableOpacity style={styles.addButtonLarge} onPress={openAddModal}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonTextLarge}>Adicionar Primeiro Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={shoppingList}
          renderItem={renderShoppingItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Item Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingItem ? 'Editar Item' : 'Novo Item'}
            </Text>

            <Text style={styles.label}>Nome do Produto</Text>
            <TextInput
              style={styles.input}
              value={itemName}
              onChangeText={setItemName}
              placeholder="Ex: Arroz, Leite, Papel..."
              placeholderTextColor="#666"
              autoFocus
            />

            <Text style={styles.label}>Categoria</Text>
            <TouchableOpacity
              style={styles.categorySelector}
              onPress={() => setCategoryModalVisible(true)}
            >
              <View style={[styles.categoryDot, { backgroundColor: getCategoryInfo(selectedCategory).color }]} />
              <Text style={styles.categorySelectorText}>
                {getCategoryInfo(selectedCategory).name}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#888" />
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              {editingItem && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={() => {
                    setModalVisible(false);
                    handleDeleteItem(editingItem.id);
                  }}
                >
                  <Ionicons name="trash" size={20} color="#F44336" />
                  <Text style={[styles.modalButtonText, { color: '#F44336' }]}>Excluir</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveItem}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione a Categoria</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    selectedCategory === cat.id && styles.categoryOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setCategoryModalVisible(false);
                  }}
                >
                  <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                  <Ionicons name={cat.icon} size={20} color={cat.color} />
                  <Text style={styles.categoryOptionText}>{cat.name}</Text>
                  {selectedCategory === cat.id && (
                    <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { marginTop: 15 }]}
              onPress={() => setCategoryModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Purchase Modal */}
      <Modal
        visible={purchaseModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPurchaseModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registrar Compra</Text>
            
            {currentItem && (
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{currentItem.name}</Text>
                <Text style={styles.productCategory}>
                  {getCategoryInfo(currentItem.category).name}
                </Text>
              </View>
            )}

            <Text style={styles.label}>Preço Pago (R$)</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0,00"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
              autoFocus
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Quantidade</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="1"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Unidade</Text>
                <TouchableOpacity
                  style={styles.unitSelector}
                  onPress={() => setUnitModalVisible(true)}
                >
                  <Text style={styles.unitSelectorText}>{selectedUnit}</Text>
                  <Ionicons name="chevron-down" size={20} color="#888" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.discountSection}>
              <TouchableOpacity
                style={[styles.discountToggle, isDiscount && styles.discountToggleActive]}
                onPress={() => setIsDiscount(!isDiscount)}
              >
                <Ionicons
                  name={isDiscount ? 'pricetag' : 'pricetag-outline'}
                  size={20}
                  color={isDiscount ? '#4CAF50' : '#888'}
                />
                <Text style={[styles.discountText, isDiscount && styles.discountTextActive]}>
                  Produto em Promoção/Desconto
                </Text>
              </TouchableOpacity>

              {isDiscount && (
                <View style={styles.originalPriceContainer}>
                  <Text style={styles.label}>Preço Original (R$)</Text>
                  <TextInput
                    style={[styles.input, { borderColor: '#4CAF50' }]}
                    value={originalPrice}
                    onChangeText={setOriginalPrice}
                    placeholder="0,00"
                    placeholderTextColor="#666"
                    keyboardType="decimal-pad"
                  />
                  {originalPrice && price && (
                    <Text style={styles.savingsText}>
                      Economia: R$ {(parseFloat(originalPrice) - parseFloat(price)).toFixed(2)}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {price && quantity && (
              <View style={styles.totalPreview}>
                <Text style={styles.totalPreviewLabel}>Total Previsto:</Text>
                <Text style={styles.totalPreviewValue}>
                  R$ {(parseFloat(price) * parseFloat(quantity)).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPurchaseModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmPurchase}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                  Confirmar Compra
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Unit Picker Modal */}
      <Modal
        visible={unitModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUnitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>Selecione a Unidade</Text>
            {UNITS.map(unit => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.unitOption,
                  selectedUnit === unit && styles.unitOptionSelected
                ]}
                onPress={() => {
                  setSelectedUnit(unit);
                  setUnitModalVisible(false);
                }}
              >
                <Text style={styles.unitOptionText}>{unit}</Text>
                {selectedUnit === unit && (
                  <Ionicons name="checkmark" size={20} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { marginTop: 10 }]}
              onPress={() => setUnitModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  itemCardPurchased: {
    opacity: 0.6,
    backgroundColor: '#151525',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  itemNamePurchased: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  itemCategory: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkButton: {
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonCompleted: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  addButtonLarge: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 30,
    gap: 10,
  },
  addButtonTextLarge: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 25,
    maxHeight: '85%',
  },
  modalContentSmall: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3a3a4e',
    marginBottom: 15,
  },
  categorySelector: {
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a4e',
    marginBottom: 15,
    gap: 10,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categorySelectorText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#F4433620',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  cancelButton: {
    backgroundColor: '#3a3a4e',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
    gap: 12,
  },
  categoryOptionSelected: {
    backgroundColor: '#2a2a3e',
  },
  categoryOptionText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  productInfo: {
    backgroundColor: '#2a2a3e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  productCategory: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 15,
  },
  halfWidth: {
    flex: 1,
  },
  unitSelector: {
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#3a3a4e',
    marginBottom: 15,
  },
  unitSelectorText: {
    color: '#fff',
    fontSize: 16,
  },
  discountSection: {
    marginTop: 5,
  },
  discountToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#2a2a3e',
    marginBottom: 10,
    gap: 10,
  },
  discountToggleActive: {
    backgroundColor: '#4CAF5020',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  discountText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
  discountTextActive: {
    color: '#4CAF50',
  },
  originalPriceContainer: {
    marginLeft: 10,
    marginTop: 5,
  },
  savingsText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  totalPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  totalPreviewLabel: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '500',
  },
  totalPreviewValue: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
  },
  unitOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  unitOptionSelected: {
    backgroundColor: '#2a2a3e',
  },
  unitOptionText: {
    color: '#fff',
    fontSize: 16,
  },
});
