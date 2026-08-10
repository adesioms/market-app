import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, getCurrentMonth } from '../utils/helpers';
import { getTotalSpent, getSpentByCategory } from '../utils/storage';
import { CATEGORIES } from '../utils/helpers';

const screenWidth = Dimensions.get('window').width;

export default function Dashboard({ navigation }) {
  const [totalSpent, setTotalSpent] = useState(0);
  const [categoryData, setCategoryData] = useState([]);
  const [currentMonth] = useState(getCurrentMonth());

  useEffect(() => {
    loadDashboardData();
  }, [currentMonth]);

  const loadDashboardData = async () => {
    const total = await getTotalSpent(currentMonth);
    setTotalSpent(total);

    const spentByCategory = await getSpentByCategory(currentMonth);
    
    const chartData = CATEGORIES
      .filter(cat => spentByCategory[cat.id] && spentByCategory[cat.id] > 0)
      .map(cat => ({
        name: cat.name,
        amount: spentByCategory[cat.id],
        color: cat.color,
        legendFontColor: '#ffffff',
        legendFontSize: 12,
      }));

    setCategoryData(chartData);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mercado App</Text>
        <Text style={styles.headerSubtitle}>Controle de Gastos</Text>
      </View>

      {/* Total Card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total gasto este mês</Text>
        <Text style={styles.totalValue}>{formatCurrency(totalSpent)}</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddPurchase')}
        >
          <Ionicons name="add" size={24} color="#1a1a2e" />
          <Text style={styles.addButtonText}>Adicionar Compra</Text>
        </TouchableOpacity>
      </View>

      {/* Chart Section */}
      {categoryData.length > 0 ? (
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Gastos por Categoria</Text>
          <PieChart
            data={categoryData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
          {/* Legend */}
          <View style={styles.legend}>
            {categoryData.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.name}</Text>
                <Text style={styles.legendValue}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="pie-chart-outline" size={64} color="#4a4a6a" />
          <Text style={styles.emptyText}>Nenhuma compra registrada este mês</Text>
          <Text style={styles.emptySubtext}>Comece adicionando suas compras!</Text>
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Resumo do Mês</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#4CAF50" />
            <Text style={styles.statLabel}>Mês Atual</Text>
            <Text style={styles.statValue}>{currentMonth}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="receipt" size={24} color="#2196F3" />
            <Text style={styles.statLabel}>Categorias</Text>
            <Text style={styles.statValue}>{categoryData.length}</Text>
          </View>
        </View>
      </View>

      {/* Comparador Button */}
      <TouchableOpacity 
        style={styles.comparatorButton}
        onPress={() => navigation.navigate('Comparator')}
      >
        <Ionicons name="scale" size={28} color="#ffffff" />
        <Text style={styles.comparatorButtonText}>Comparador de Produtos</Text>
        <Text style={styles.comparatorSubtext}>Encontre o melhor custo-benefício</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8888aa',
    marginTop: 4,
  },
  totalCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#8888aa',
  },
  totalValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginVertical: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
  },
  addButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  chartContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  legend: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 12,
  },
  legendText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  legendValue: {
    color: '#8888aa',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    margin: 16,
    padding: 40,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    alignItems: 'center',
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
  statsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    padding: 12,
  },
  statLabel: {
    color: '#8888aa',
    fontSize: 12,
    marginTop: 8,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  comparatorButton: {
    margin: 16,
    padding: 24,
    backgroundColor: '#2196F3',
    borderRadius: 16,
    alignItems: 'center',
  },
  comparatorButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  comparatorSubtext: {
    color: '#bbdefb',
    fontSize: 14,
    marginTop: 4,
  },
});
