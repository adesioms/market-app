import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getPurchaseHistory, removeFromPurchaseHistory, updatePurchaseHistoryItem, getItemTotal, CATEGORIES } from '../utils/storage';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState(null);

  const loadHistory = useCallback(async () => {
    const data = await getPurchaseHistory();
    setHistory(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  useEffect(() => {
    filterHistory();
  }, [history, selectedMonth, selectedYear, selectedCategory]);

  const filterHistory = () => {
    const filtered = history.filter(item => {
      const purchaseDate = new Date(item.purchaseDate);
      if (Number.isNaN(purchaseDate.getTime())) return false;

      const matchMonth = purchaseDate.getMonth() === selectedMonth;
      const matchYear = purchaseDate.getFullYear() === selectedYear;
      const matchCategory = selectedCategory ? item.category === selectedCategory : true;

      return matchMonth && matchYear && matchCategory;
    });

    // Ordenar por data da compra (mais recente primeiro)
    filtered.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
    setFilteredHistory(filtered);
  };

  const handleOpenEdit = (item) => {
    const date = new Date(item.purchaseDate);
    const dateText = Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString('pt-BR');
    setEditingItem({ id: item.id, purchaseDate: dateText });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    const value = editingItem?.purchaseDate?.trim();
    const match = value?.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (!match) {
      Alert.alert('Data inválida', 'Use o formato DD/MM/AAAA.');
      return;
    }

    const [, day, month, year] = match;
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    if (parsedDate.getFullYear() !== Number(year) || parsedDate.getMonth() !== Number(month) - 1 || parsedDate.getDate() !== Number(day)) {
      Alert.alert('Data inválida', 'Informe uma data real.');
      return;
    }

    const purchaseDate = parsedDate.toISOString();
    const saved = await updatePurchaseHistoryItem(editingItem.id, { purchaseDate });
    if (!saved) {
      Alert.alert('Erro', 'Não foi possível atualizar a data da compra.');
      return;
    }

    setSelectedMonth(parsedDate.getMonth());
    setSelectedYear(parsedDate.getFullYear());
    setEditModalVisible(false);
    setEditingItem(null);
    loadHistory();
  };

  const handleDelete = (id) => {
    Alert.alert('Remover compra', 'Tem certeza que deseja excluir este item do histórico?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const removed = await removeFromPurchaseHistory(id);
          if (removed) {
            loadHistory();
          } else {
            Alert.alert('Erro', 'Não foi possível remover esta compra. Tente novamente.');
          }
        }
      }
    ]);
  };

  const getMonths = () => {
    const currentDate = new Date();

    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - index, 1);
      return { month: date.getMonth(), year: date.getFullYear() };
    });
  };

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const getTotalFiltered = () => filteredHistory.reduce((sum, item) => sum + getItemTotal(item), 0);

  const renderCategoryBadge = (category) => {
    const catConfig = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];
    return (
      <View style={[styles.badge, { backgroundColor: catConfig.color + '30' }]}>
        <MaterialCommunityIcons name={catConfig.icon} size={12} color={catConfig.color} />
        <Text style={[styles.badgeText, { color: catConfig.color }]}>{catConfig.name}</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.brand && <Text style={styles.cardBrand}>{item.brand}</Text>}
          {item.isPromotion && (
            <View style={styles.promoTag}>
              <Text style={styles.promoText}>PROMO</Text>
            </View>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity accessibilityLabel={`Editar data de ${item.name}`} onPress={() => handleOpenEdit(item)}>
            <Ionicons name="create-outline" size={20} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel={`Remover ${item.name} do histórico`} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Valor total:</Text>
          <Text style={styles.infoValue}>
            {item.price !== null && item.price !== undefined
              ? `R$ ${getItemTotal(item).toFixed(2).replace('.', ',')}`
              : 'A informar'}
          </Text>
        </View>
        
        {item.originalPrice !== null && item.originalPrice !== undefined && item.isPromotion && item.price !== null && item.price !== undefined && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>De: R$ {getItemTotal({ ...item, price: item.originalPrice }).toFixed(2).replace('.', ',')}</Text>
            <Text style={[styles.infoValue, { color: '#4CAF50' }]}>
              Economia: R$ {(getItemTotal({ ...item, price: item.originalPrice }) - getItemTotal(item)).toFixed(2).replace('.', ',')}
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Qtd:</Text>
          <Text style={styles.infoValue}>{item.quantity} {item.unit}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Data:</Text>
          <Text style={styles.infoValue}>
            {new Date(item.purchaseDate).toLocaleDateString('pt-BR')}
          </Text>
        </View>

        {renderCategoryBadge(item.category)}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header com Filtro */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={20} color="#fff" />
          <Text style={styles.filterButtonText}>Filtrar</Text>
        </TouchableOpacity>
      </View>

      {/* Resumo do Filtro Atual */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {monthNames[selectedMonth]}/{selectedYear}
          {selectedCategory ? ` • ${CATEGORIES.find(c => c.id === selectedCategory)?.name}` : ''}
        </Text>
        <Text style={styles.totalText}>
          Total: R$ {getTotalFiltered().toFixed(2)}
        </Text>
      </View>

      {/* Lista */}
      {filteredHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>Nenhuma compra neste período</Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal para editar a data da compra */}
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.modalTitle}>Editar data da compra</Text>
            <Text style={styles.editHelper}>Use a data do ticket ou do dia em que a compra realmente aconteceu.</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#8888aa"
              keyboardType="numbers-and-punctuation"
              value={editingItem?.purchaseDate || ''}
              onChangeText={(purchaseDate) => setEditingItem({ ...editingItem, purchaseDate })}
              autoFocus
            />
            <View style={styles.editButtons}>
              <TouchableOpacity style={styles.cancelEditButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelEditText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveEditButton} onPress={handleSaveEdit}>
                <Text style={styles.saveEditText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Filtro */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrar Histórico</Text>

            <Text style={styles.modalLabel}>Mês/Ano:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthsScroll}>
              {getMonths().map((m, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.monthChip,
                    selectedMonth === m.month && selectedYear === m.year && styles.monthChipSelected
                  ]}
                  onPress={() => {
                    setSelectedMonth(m.month);
                    setSelectedYear(m.year);
                  }}
                >
                  <Text style={[
                    styles.monthChipText,
                    selectedMonth === m.month && selectedYear === m.year && styles.monthChipTextSelected
                  ]}>
                    {monthNames[m.month]}/{m.year.toString().substr(2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Categoria:</Text>
            <View style={styles.categoriesGrid}>
              <TouchableOpacity
                style={[
                  styles.catChip,
                  !selectedCategory && styles.catChipSelected
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[
                  styles.catChipText,
                  !selectedCategory && styles.catChipTextSelected
                ]}>Todas</Text>
              </TouchableOpacity>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catChip,
                    selectedCategory === cat.id && { borderColor: cat.color, borderWidth: 2 }
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <MaterialCommunityIcons name={cat.icon} size={16} color={selectedCategory === cat.id ? cat.color : '#888'} />
                  <Text style={[
                    styles.catChipText,
                    selectedCategory === cat.id && { color: cat.color }
                  ]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  filterButtonText: { color: '#fff', marginLeft: 5, fontWeight: 'bold' },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#16162a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  summaryText: { color: '#aaa', fontSize: 14 },
  totalText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 16 },
  listContent: { padding: 15 },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitleContainer: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  cardBrand: { fontSize: 14, color: '#888', fontStyle: 'italic' },
  promoTag: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  promoText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  cardBody: { borderTopWidth: 1, borderTopColor: '#2a2a4e', paddingTop: 10 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  infoLabel: { color: '#888', fontSize: 14 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '500' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  badgeText: { marginLeft: 5, fontSize: 12, fontWeight: 'bold' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  emptyText: { color: '#888', marginTop: 15, fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  editModalContent: { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 20, margin: 20 },
  editHelper: { color: '#aaaac0', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  dateInput: { backgroundColor: '#2a2a4e', color: '#fff', padding: 14, borderRadius: 10, fontSize: 18, marginBottom: 14 },
  editButtons: { flexDirection: 'row', gap: 10 },
  cancelEditButton: { flex: 1, backgroundColor: '#2a2a4e', padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelEditText: { color: '#fff', fontWeight: '600' },
  saveEditButton: { flex: 1, backgroundColor: '#4CAF50', padding: 14, borderRadius: 10, alignItems: 'center' },
  saveEditText: { color: '#fff', fontWeight: 'bold' },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  modalLabel: { color: '#aaa', fontSize: 14, marginBottom: 10, marginTop: 10 },
  monthsScroll: { marginBottom: 10 },
  monthChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a4e',
    marginRight: 10,
  },
  monthChipSelected: { backgroundColor: '#4CAF50' },
  monthChipText: { color: '#aaa', fontWeight: 'bold' },
  monthChipTextSelected: { color: '#fff' },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#2a2a4e',
    marginRight: 8,
    marginBottom: 8,
  },
  catChipSelected: { backgroundColor: '#4CAF50' },
  catChipText: { color: '#aaa', marginLeft: 5, fontWeight: 'bold' },
  catChipTextSelected: { color: '#fff' },
  closeButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});