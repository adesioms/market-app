import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatDate, CATEGORIES, getCurrentMonth } from '../utils/helpers';
import { getAllPurchases, getPurchasesByMonth, deletePurchase } from '../utils/storage';

export default function History({ navigation }) {
  const [purchases, setPurchases] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    loadPurchases();
  }, [selectedMonth, selectedCategory]);

  const loadPurchases = async () => {
    let data;
    if (selectedCategory) {
      const allPurchases = await getAllPurchases();
      data = allPurchases.filter(p => {
        const purchaseDate = new Date(p.date);
        const purchaseYearMonth = `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}`;
        return purchaseYearMonth === selectedMonth && p.categoryId === selectedCategory;
      });
    } else {
      data = await getPurchasesByMonth(selectedMonth);
    }
    
    // Ordenar por data (mais recente primeiro)
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    setPurchases(data);
  };

  const handleDelete = async (id) => {
    const success = await deletePurchase(id);
    if (success) {
      loadPurchases();
    }
  };

  const getCategoryById = (id) => {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES[7];
  };

  const renderPurchase = ({ item }) => {
    const category = getCategoryById(item.categoryId);
    
    return (
      <View style={styles.purchaseCard}>
        <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
          <Ionicons name={category.icon} size={20} color="#ffffff" />
        </View>
        
        <View style={styles.purchaseInfo}>
          <Text style={styles.productName}>{item.productName}</Text>
          <View style={styles.purchaseMeta}>
            <Text style={styles.purchaseDate}>{formatDate(item.date)}</Text>
            <Text style={styles.purchaseCategory}>{category.name}</Text>
          </View>
          {item.quantity && item.quantity > 1 && (
            <Text style={styles.quantity}>
              {item.quantity} {item.unit || 'un'}
            </Text>
          )}
        </View>
        
        <View style={styles.purchaseActions}>
          <Text style={styles.purchasePrice}>{formatCurrency(item.price)}</Text>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    months.push({ yearMonth, monthName });
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico de Compras</Text>
      </View>

      {/* Month Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Mês:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {months.map((month) => (
            <TouchableOpacity
              key={month.yearMonth}
              style={[
                styles.monthChip,
                selectedMonth === month.yearMonth && styles.monthChipActive,
              ]}
              onPress={() => setSelectedMonth(month.yearMonth)}
            >
              <Text
                style={[
                  styles.monthChipText,
                  selectedMonth === month.yearMonth && styles.monthChipTextActive,
                ]}
              >
                {month.monthName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Category Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Categoria:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.categoryChip,
              !selectedCategory && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.categoryChipText,
                !selectedCategory && styles.categoryChipTextActive,
              ]}
            >
              Todas
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && {
                  backgroundColor: category.color,
                  borderColor: category.color,
                },
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Ionicons 
                name={category.icon} 
                size={16} 
                color={selectedCategory === category.id ? '#ffffff' : category.color} 
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category.id && { color: '#ffffff' },
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Purchases List */}
      {purchases.length > 0 ? (
        <FlatList
          data={purchases}
          renderItem={renderPurchase}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color="#4a4a6a" />
          <Text style={styles.emptyText}>Nenhuma compra encontrada</Text>
          <Text style={styles.emptySubtext}>
            {selectedCategory ? 'para esta categoria e mês' : 'neste mês'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  filterSection: {
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  filterLabel: {
    color: '#8888aa',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  monthChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a3e',
    marginRight: 8,
  },
  monthChipActive: {
    backgroundColor: '#4CAF50',
  },
  monthChipText: {
    color: '#8888aa',
    fontSize: 13,
    fontWeight: '500',
  },
  monthChipTextActive: {
    color: '#ffffff',
  },
  categoriesScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2a2a3e',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#4CAF50',
  },
  categoryChipText: {
    color: '#8888aa',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  listContent: {
    padding: 12,
  },
  purchaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  purchaseInfo: {
    flex: 1,
  },
  productName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  purchaseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  purchaseDate: {
    color: '#8888aa',
    fontSize: 12,
  },
  purchaseCategory: {
    color: '#8888aa',
    fontSize: 12,
    marginLeft: 8,
  },
  quantity: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 2,
  },
  purchaseActions: {
    alignItems: 'flex-end',
  },
  purchasePrice: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#8888aa',
    fontSize: 14,
    marginTop: 8,
  },
});

// Import missing ScrollView - REMOVED (already imported above)
