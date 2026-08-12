import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMasterList, addToMasterList, removeFromMasterList, CATEGORIES } from '../utils/storage';

export default function MasterListScreen() {
  const [masterList, setMasterList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', brand: '', category: 'outros' });

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    const list = await getMasterList();
    setMasterList(list);
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      Alert.alert('Erro', 'Digite o nome do produto');
      return;
    }
    await addToMasterList(newItem);
    setNewItem({ name: '', brand: '', category: 'outros' });
    setModalVisible(false);
    loadList();
  };

  const handleDelete = async (id) => {
    Alert.alert('Confirmar', 'Remover este produto da lista mestra?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        await removeFromMasterList(id);
        loadList();
      }}
    ]);
  };

  const renderCategoryIcon = (categoryId) => {
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat ? cat.icon : 'grid';
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemLeft}>
        <View style={[styles.itemIcon, { backgroundColor: CATEGORIES.find(c => c.id === item.category)?.color || '#9E9E9E' }]}>
          <Ionicons name={renderCategoryIcon(item.category)} size={20} color="#fff" />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.brand && (
            <Text style={styles.itemBrand}>{item.brand}</Text>
          )}
          <Text style={styles.itemCategory}>
            {CATEGORIES.find(c => c.id === item.category)?.name || 'Outros'}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)}>
        <Ionicons name="trash-outline" size={20} color="#F44336" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lista Mestra</Text>
        <Text style={styles.headerSubtitle}>Produtos recorrentes</Text>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Adicionar Produto</Text>
      </TouchableOpacity>

      {masterList.length > 0 ? (
        <FlatList
          data={masterList}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="star-outline" size={64} color="#8888aa" />
          <Text style={styles.emptyText}>Sua lista mestra está vazia</Text>
          <Text style={styles.emptySubtext}>Adicione produtos que você compra frequentemente</Text>
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar à Lista Mestra</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nome do produto"
              placeholderTextColor="#8888aa"
              value={newItem.name}
              onChangeText={(text) => setNewItem({...newItem, name: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Marca (ex: Tio João, Nestlé)"
              placeholderTextColor="#8888aa"
              value={newItem.brand}
              onChangeText={(text) => setNewItem({...newItem, brand: text})}
            />
            
            <Text style={styles.label}>Categoria</Text>
            <View style={styles.categorySelector}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, newItem.category === cat.id && { backgroundColor: cat.color }]}
                  onPress={() => setNewItem({...newItem, category: cat.id})}
                >
                  <Ionicons name={cat.icon} size={16} color="#fff" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { padding: 16, backgroundColor: '#1a1a2e' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#8888aa', fontSize: 14, marginTop: 4 },
  addButton: { margin: 16, flexDirection: 'row', backgroundColor: '#FF9800', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  listContent: { paddingHorizontal: 16 },
  itemCard: { backgroundColor: '#1a1a2e', padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  itemBrand: { color: '#8888aa', fontSize: 14 },
  itemCategory: { color: '#4CAF50', fontSize: 12, marginTop: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#fff', fontSize: 18, marginTop: 16 },
  emptySubtext: { color: '#8888aa', fontSize: 14, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a2e', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#2a2a3e', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 12 },
  label: { color: '#fff', fontSize: 14, marginBottom: 8 },
  categorySelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryChip: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#2a2a3e', borderRadius: 20, alignItems: 'center', gap: 6 },
  categoryChipText: { color: '#fff', fontSize: 14 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, backgroundColor: '#2a2a3e', padding: 16, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontSize: 16 },
  saveButton: { flex: 1, backgroundColor: '#FF9800', padding: 16, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
