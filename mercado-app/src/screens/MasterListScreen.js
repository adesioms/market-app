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
import { 
  getMasterList, 
  addToMasterList, 
  removeFromMasterList,
  addToShoppingList
} from '../utils/storage';

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

export default function MasterListScreen({ navigation }) {
  const [masterList, setMasterList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('outros');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  useEffect(() => {
    loadMasterList();
  }, []);

  const loadMasterList = async () => {
    const list = await getMasterList();
    setMasterList(list);
  };

  const openAddModal = () => {
    setItemName('');
    setItemBrand('');
    setSelectedCategory('outros');
    setModalVisible(true);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      Alert.alert('Atenção', 'Digite o nome do produto');
      return;
    }

    const itemData = {
      name: itemName.trim(),
      brand: itemBrand.trim(),
      categoryId: selectedCategory,
    };

    try {
      await addToMasterList(itemData);
      setModalVisible(false);
      setItemName('');
      setItemBrand('');
      setSelectedCategory('outros');
      loadMasterList();
      Alert.alert('Sucesso', 'Produto cadastrado na lista mestra!');
    } catch (error) {
      Alert.alert('Erro', error.message || 'Erro ao salvar item');
    }
  };

  const handleDeleteItem = (id) => {
    Alert.alert(
      'Excluir produto',
      'Tem certeza que deseja remover este produto da lista mestra?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await removeFromMasterList(id);
            loadMasterList();
          },
        },
      ]
    );
  };

  const handleAddToShoppingList = async (item) => {
    try {
      await addToShoppingList({
        name: item.name,
        brand: item.brand,
        categoryId: item.categoryId,
      });
      Alert.alert(
        'Adicionado!',
        `"${item.name}" foi adicionado à sua lista de compras.`,
        [{ text: 'OK' }]
      );
      navigation.navigate('ListaCompras');
    } catch (error) {
      Alert.alert('Erro', 'Erro ao adicionar à lista de compras');
    }
  };

  const getCategoryInfo = (catId) => {
    return CATEGORIES.find(c => c.id === catId) || CATEGORIES[7];
  };

  const renderMasterItem = ({ item }) => {
    const category = getCategoryInfo(item.categoryId);
    
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemLeft}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
            <Ionicons name={category.icon} size={20} color={category.color} />
          </View>
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.brand && (
              <Text style={styles.itemBrand}>{item.brand}</Text>
            )}
            <Text style={styles.itemCategory}>{category.name}</Text>
          </View>
        </View>
        
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddToShoppingList(item)}
            title="Adicionar à lista"
          >
            <Ionicons name="cart-outline" size={22} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteItem(item.id)}
          >
            <Ionicons name="trash-outline" size={22} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lista Mestra</Text>
        <Text style={styles.headerSubtitle}>
          Cadastre seus produtos recorrentes para facilitar as compras
        </Text>
      </View>

      {masterList.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={80} color="#333" />
          <Text style={styles.emptyTitle}>Sua lista mestra está vazia</Text>
          <Text style={styles.emptySubtitle}>
            Adicione produtos que você compra frequentemente
          </Text>
          <TouchableOpacity style={styles.addButtonLarge} onPress={openAddModal}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonTextLarge}>Cadastrar Primeiro Produto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={masterList}
          renderItem={renderMasterItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add Item Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Produto</Text>

            <Text style={styles.label}>Nome do Produto</Text>
            <TextInput
              style={styles.input}
              value={itemName}
              onChangeText={setItemName}
              placeholder="Ex: Arroz, Leite, Papel..."
              placeholderTextColor="#666"
              autoFocus
            />

            <Text style={styles.label}>Marca (opcional)</Text>
            <TextInput
              style={styles.input}
              value={itemBrand}
              onChangeText={setItemBrand}
              placeholder="Ex: Tio João, Nestlé, Sadia..."
              placeholderTextColor="#666"
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 20,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
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
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  itemBrand: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  itemCategory: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF5020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4433620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    gap: 10,
  },
  addButtonTextLarge: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    maxHeight: '85%',
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
    color: '#ccc',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3a3a4e',
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3a3a4e',
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
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#3a3a4e',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    fontSize: 15,
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
});
