import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPurchaseHistory, CATEGORIES } from '../utils/storage';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = new Date().getMonth();
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterHistory();
  }, [history, selectedMonth, selectedCategory]);

  const loadHistory = async () => {
    const data = await getPurchaseHistory();
    setHistory(data);
  };

  const filterHistory = () => {
    let filtered = [...history];
    
    // Filtro por mês
    const now = new Date();
    const targetYear = selectedMonth > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.purchaseDate);
      return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === targetYear;
    });
    
    // Filtro por categoria
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    setFilteredHistory(filtered);
  };

  const getMonthName = (monthIndex) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[monthIndex];
  };

  const renderCategoryIcon = (categoryId) => {
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat ? cat.icon : 'grid';
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={[styles.itemIcon, { backgroundColor: CATEGORIES.find(c => c.id === item.category)?.color || '#9E9E9E' }]}>
        <Ionicons name={renderCategoryIcon(item.category)} size={20} color="#fff" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
        <View style={styles.itemMeta}>
          <Text style={styles.itemDate}>
            {new Date(item.purchaseDate).toLocaleDateString('pt-BR')}
          </Text>
          {item.isPromotion && <Text style={styles.promotionTag}>PROMO</Text>}
        </View>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemPrice}>R$ {(item.price * item.quantity).toFixed(2)}</Text>
        <Text style={styles.itemQuantity}>{item.quantity} {item.unit}</Text>
      </View>
    </View>
  );

  const totalMonth = filteredHistory.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico de Compras</Text>
        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
          <Ionicons name="filter" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total em {getMonthName(selectedMonth)}</Text>
        <Text style={styles.summaryValue}>R$ {totalMonth.toFixed(2)}</Text>
        <Text style={styles.summaryItems}>{filteredHistory.length} itens</Text>
      </View>

      {filteredHistory.length > 0 ? (
        <FlatList
          data={filteredHistory}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color="#8888aa" />
          <Text style={styles.emptyText}>Nenhuma compra neste período</Text>
        </View>
      )}

      {/* Modal de Filtros */}
      <Modal visible={filterModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrar por</Text>
            
            <Text style={styles.label}>Mês</Text>
            <View style={styles.monthSelector}>
              {Array.from({ length: 12 }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.monthChip, selectedMonth === i && styles.monthChipSelected]}
                  onPress={() => setSelectedMonth(i)}
                >
                  <Text style={[styles.monthText, selectedMonth === i && styles.monthTextSelected]}>
                    {getMonthName(i)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.label}>Categoria</Text>
            <View style={styles.categorySelector}>
              <TouchableOpacity
                style={[styles.categoryChip, !selectedCategory && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextSelected]}>Todas</Text>
              </TouchableOpacity>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, selectedCategory === cat.id && { backgroundColor: cat.color }]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextSelected]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity style={styles.closeButton} onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.closeButtonText}>Fechar</Text>
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
  filterButton: { backgroundColor: '#2a2a3e', padding: 8, borderRadius: 8 },
  summaryCard: { margin: 16, padding: 20, backgroundColor: '#1a1a2e', borderRadius: 16, alignItems: 'center' },
  summaryLabel: { color: '#8888aa', fontSize: 14 },
  summaryValue: { color: '#4CAF50', fontSize: 32, fontWeight: 'bold', marginVertical: 8 },
  summaryItems: { color: '#fff', fontSize: 14 },
  listContent: { paddingHorizontal: 16 },
  itemCard: { backgroundColor: '#1a1a2e', padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  itemIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  itemBrand: { color: '#8888aa', fontSize: 14 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  itemDate: { color: '#8888aa', fontSize: 12 },
  promotionTag: { backgroundColor: '#FF9800', color: '#fff', fontSize: 10, paddingHorizontal: 6, borderRadius: 4, marginLeft: 8 },
  itemRight: { alignItems: 'flex-end' },
  itemPrice: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  itemQuantity: { color: '#8888aa', fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#fff', fontSize: 18, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a2e', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  label: { color: '#fff', fontSize: 14, marginBottom: 8, marginTop: 16 },
  monthSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthChip: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#2a2a3e', borderRadius: 8 },
  monthChipSelected: { backgroundColor: '#4CAF50' },
  monthText: { color: '#fff', fontSize: 14 },
  monthTextSelected: { fontWeight: 'bold' },
  categorySelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#2a2a3e', borderRadius: 20 },
  categoryChipSelected: { backgroundColor: '#4CAF50' },
  categoryChipText: { color: '#fff', fontSize: 14 },
  categoryChipTextSelected: { fontWeight: 'bold' },
  closeButton: { backgroundColor: '#2a2a3e', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  closeButtonText: { color: '#fff', fontSize: 16 },
});
