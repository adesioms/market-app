import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMasterList, addToMasterList, updateMasterListItem, removeFromMasterList, CATEGORIES } from '../utils/storage';

const EMPTY_ITEM = { name: '', brand: '', category: 'outros' };

export default function MasterListScreen() {
  const [masterList, setMasterList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [formItem, setFormItem] = useState(EMPTY_ITEM);
  const [editingItemId, setEditingItemId] = useState(null);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    const list = await getMasterList();
    setMasterList(list);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItemId(null);
    setFormItem(EMPTY_ITEM);
  };

  const handleOpenAdd = () => {
    setEditingItemId(null);
    setFormItem(EMPTY_ITEM);
    setModalVisible(true);
  };

  const handleOpenEdit = (item) => {
    const categoryExists = CATEGORIES.some(category => category.id === item.category);
    setEditingItemId(item.id);
    setFormItem({
      name: item.name || '',
      brand: item.brand || '',
      category: categoryExists ? item.category : 'outros'
    });
    setModalVisible(true);
  };

  const handleSaveItem = async () => {
    const name = formItem.name.trim();
    if (!name) {
      Alert.alert('Erro', 'Digite o nome do produto');
      return;
    }

    const itemData = {
      name,
      brand: formItem.brand.trim(),
      category: formItem.category
    };

    const saved = editingItemId
      ? await updateMasterListItem(editingItemId, itemData)
      : await addToMasterList(itemData);

    if (!saved) {
      Alert.alert('Erro', 'Não foi possível salvar o produto. Tente novamente.');
      return;
    }

    closeModal();
    loadList();
  };

  const handleDelete = (id) => {
    Alert.alert('Confirmar', 'Remover este produto da lista mestra?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const removed = await removeFromMasterList(id);
          if (removed) {
            loadList();
          } else {
            Alert.alert('Erro', 'Não foi possível remover o produto. Tente novamente.');
          }
        }
      }
    ]);
  };

  const getCategory = (categoryId) => CATEGORIES.find(category => category.id === categoryId);

  const renderItem = ({ item }) => {
    const category = getCategory(item.category);

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemLeft}>
          <View style={[styles.itemIcon, { backgroundColor: category?.color || '#9E9E9E' }]}>
            <Ionicons name={category?.icon || 'grid'} size={20} color="#fff" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.brand ? <Text style={styles.itemBrand}>{item.brand}</Text> : null}
            <Text style={styles.itemCategory}>{category?.name || 'Outros'}</Text>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            accessibilityLabel={`Editar ${item.name}`}
            style={styles.editButton}
            onPress={() => handleOpenEdit(item)}
          >
            <Ionicons name="pencil-outline" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel={`Remover ${item.name}`}
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lista Mestra</Text>
        <Text style={styles.headerSubtitle}>Produtos recorrentes</Text>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleOpenAdd}>
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

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {editingItemId ? 'Editar Produto' : 'Adicionar à Lista Mestra'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Nome do produto"
                placeholderTextColor="#8888aa"
                value={formItem.name}
                onChangeText={(name) => setFormItem({ ...formItem, name })}
                autoFocus
              />

              <TextInput
                style={styles.input}
                placeholder="Marca (ex.: Tio João, Nestlé)"
                placeholderTextColor="#8888aa"
                value={formItem.brand}
                onChangeText={(brand) => setFormItem({ ...formItem, brand })}
              />

              <Text style={styles.label}>Categoria</Text>
              <View style={styles.categorySelector}>
                {CATEGORIES.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      formItem.category === category.id && { backgroundColor: category.color }
                    ]}
                    onPress={() => setFormItem({ ...formItem, category: category.id })}
                  >
                    <Ionicons name={category.icon} size={16} color="#fff" />
                    <Text style={styles.categoryChipText}>{category.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveItem}>
                  <Text style={styles.saveButtonText}>{editingItemId ? 'Salvar Alterações' : 'Salvar'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  itemCard: { backgroundColor: '#1a1a2e', padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  itemBrand: { color: '#8888aa', fontSize: 14 },
  itemCategory: { color: '#4CAF50', fontSize: 12, marginTop: 4 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editButton: { padding: 8 },
  deleteButton: { padding: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#fff', fontSize: 18, marginTop: 16 },
  emptySubtext: { color: '#8888aa', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  modalScrollContent: { padding: 24 },
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
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});
