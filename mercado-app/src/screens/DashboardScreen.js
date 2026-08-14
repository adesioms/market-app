import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { getDashboardStats, CATEGORIES } from '../utils/storage';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const [stats, setStats] = useState({ totalSpent: 0, categoryData: [], totalItems: 0, promotionCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await getDashboardStats();
    setStats(data);
    setLoading(false);
  };

  const chartData = stats.categoryData.map(item => ({
    name: item.name,
    population: item.value,
    color: item.color,
    legendFontColor: '#fff',
    legendFontSize: 12
  }));

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Total Gasto */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Gasto no Mês</Text>
        <Text style={styles.totalValue}>R$ {stats.totalSpent.toFixed(2)}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="cart" size={20} color="#4CAF50" />
            <Text style={styles.statText}>{stats.totalItems} itens</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="pricetag" size={20} color="#FF9800" />
            <Text style={styles.statText}>{stats.promotionCount} promoções</Text>
          </View>
        </View>
      </View>

      {/* Gráfico por Categoria */}
      {chartData.length > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Gastos por Categoria</Text>
          <PieChart
            data={chartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="#1a1a2e"
            paddingLeft="15"
            absolute
          />
          {/* Legenda */}
          <View style={styles.legend}>
            {stats.categoryData.map((cat, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: cat.color }]} />
                <Text style={styles.legendText}>{cat.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="cart-outline" size={48} color="#8888aa" />
          <Text style={styles.emptyText}>Nenhuma compra registrada este mês</Text>
          <Text style={styles.emptySubtext}>Adicione compras para ver estatísticas</Text>
        </View>
      )}

      {/* Categorias Disponíveis */}
      <View style={styles.categoriesCard}>
        <Text style={styles.cardTitle}>Categorias</Text>
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((cat) => (
            <View key={cat.id} style={styles.categoryItem}>
              <View style={[styles.categoryIcon, { backgroundColor: cat.color }]}>
                <MaterialCommunityIcons name={cat.icon} size={20} color="#fff" />
              </View>
              <Text style={styles.categoryName}>{cat.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  loadingText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 50,
  },
  totalCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    alignItems: 'center',
  },
  totalLabel: {
    color: '#8888aa',
    fontSize: 16,
    marginBottom: 8,
  },
  totalValue: {
    color: '#4CAF50',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    color: '#fff',
    fontSize: 14,
  },
  chartCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    alignItems: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    color: '#fff',
    fontSize: 12,
  },
  emptyCard: {
    margin: 16,
    padding: 32,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#8888aa',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  categoriesCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
  },
});
