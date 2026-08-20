import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getPurchaseHistory, addToPurchaseHistory, removeFromPurchaseHistory, updatePurchaseHistoryItem, updatePurchaseHistoryItems, getItemTotal, CATEGORIES, UNITS } from '../utils/storage';

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');
const moneyDigitsFromValue = (value) => value === null || value === undefined ? '' : String(Math.round(Number(value) * 100));
const parseMoneyDigits = (digits) => digits ? Number(digits) / 100 : null;
const formatMoneyDigits = (digits) => {
  const numeric = onlyDigits(digits);
  if (!numeric) return '';
  return (Number(numeric) / 100).toFixed(2).replace('.', ',');
};
const quantityScale = (unit) => unit === 'kg' || unit === 'L' ? 1000 : 1;
const parseQuantityInput = (digits, unit) => {
  const numeric = Number(onlyDigits(digits));
  return Number.isFinite(numeric) && numeric > 0 ? numeric / quantityScale(unit) : 0;
};
const quantityDigitsFromValue = (value, unit) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? String(Math.round(numeric * quantityScale(unit))) : '';
};
const formatQuantityDigits = (digits, unit) => {
  const numeric = Number(onlyDigits(digits));
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return quantityScale(unit) === 1000 ? (numeric / 1000).toFixed(3).replace('.', ',') : String(numeric);
};

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [visitEditVisible, setVisitEditVisible] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [itemDetailVisible, setItemDetailVisible] = useState(false);
  const [editingHistoryItem, setEditingHistoryItem] = useState(null);
  const [addItemVisible, setAddItemVisible] = useState(false);
  const [addItemContext, setAddItemContext] = useState(null);
  const [newHistoryItem, setNewHistoryItem] = useState({ name: '', brand: '', quantityDigits: '', unit: 'un', priceDigits: '', isPromotion: false, originalPriceDigits: '' });
  
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

  const handleOpenEdit = (entry) => {
    const firstItem = entry.items?.[0] || entry;
    const date = new Date(firstItem.purchaseDate);
    const dateText = Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString('pt-BR');
    setEditingItem({
      ids: entry.items?.map(item => item.id) || [entry.id],
      purchaseDate: dateText
    });
    setEditModalVisible(true);
  };

  const handleOpenVisitEdit = (group) => {
    const firstItem = group.items[0];
    const legacyGroups = Object.values(history.reduce((groups, item) => {
      const itemDate = new Date(item.purchaseDate);
      const dateKey = Number.isNaN(itemDate.getTime()) ? 'unknown-date' : itemDate.toISOString().slice(0, 10);
      const marketName = item.marketName || item.storeName || 'Mercado não informado';
      const key = item.purchaseVisitId ? `visit:${item.purchaseVisitId}` : `${dateKey}|${marketName}`;
      if (!groups[key]) groups[key] = { key, date: item.purchaseDate, marketName, items: [] };
      groups[key].items.push(item);
      return groups;
    }, {})).filter(candidate => candidate.key !== group.key).sort((first, second) => new Date(second.date) - new Date(first.date));
    setEditingVisit({
      ids: group.items.map(item => item.id),
      purchaseDate: getGroupDateLabel(firstItem.purchaseDate) === 'Data não informada' ? '' : getGroupDateLabel(firstItem.purchaseDate),
      marketName: group.marketName === 'Mercado não informado' ? '' : group.marketName,
      mergeTargetKey: null,
      availableVisits: legacyGroups
    });
    setVisitEditVisible(true);
  };

  const handleSaveVisitEdit = async () => {
    const value = editingVisit?.purchaseDate?.trim();
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

    const mergeTarget = editingVisit.mergeTargetKey
      ? editingVisit.availableVisits?.find(candidate => candidate.key === editingVisit.mergeTargetKey)
      : null;
    const allIds = mergeTarget
      ? [...editingVisit.ids, ...mergeTarget.items.map(item => item.id)]
      : editingVisit.ids;
    const updates = {
      purchaseDate: parsedDate.toISOString(),
      marketName: editingVisit.marketName?.trim() || null,
      ...(mergeTarget ? { purchaseVisitId: mergeTarget.items.find(item => item.purchaseVisitId)?.purchaseVisitId || `visit-${Date.now()}` } : {})
    };
    const saved = await updatePurchaseHistoryItems(allIds, updates);
    if (!saved) {
      Alert.alert('Erro', 'Não foi possível atualizar a visita.');
      return;
    }
    setVisitEditVisible(false);
    setEditingVisit(null);
    setSelectedMonth(parsedDate.getMonth());
    setSelectedYear(parsedDate.getFullYear());
    loadHistory();
  };

  const handleOpenItemDetail = (item) => {
    setEditingHistoryItem({
      id: item.id,
      name: item.name || '',
      brand: item.brand || '',
      quantityDigits: quantityDigitsFromValue(item.quantity, item.unit || 'un'),
      unit: item.unit || 'un',
      priceDigits: moneyDigitsFromValue(item.price),
      priceMode: item.priceMode || 'total',
      priceUnit: item.priceUnit || item.unit || 'un',
      isPromotion: Boolean(item.isPromotion),
      originalPriceDigits: moneyDigitsFromValue(item.originalPrice)
    });
    setItemDetailVisible(true);
  };

  const handleSaveItemDetail = async () => {
    const name = editingHistoryItem?.name?.trim();
    if (!name) {
      Alert.alert('Produto inválido', 'Informe o nome do produto.');
      return;
    }
    const quantity = parseQuantityInput(editingHistoryItem.quantityDigits, editingHistoryItem.unit);
    const saved = await updatePurchaseHistoryItem(editingHistoryItem.id, {
      name,
      brand: editingHistoryItem.brand?.trim() || '',
      quantity: quantity > 0 ? quantity : null,
      unit: editingHistoryItem.unit || 'un',
      price: parseMoneyDigits(editingHistoryItem.priceDigits),
      priceMode: editingHistoryItem.priceMode || 'total',
      priceUnit: editingHistoryItem.priceUnit || editingHistoryItem.unit || 'un',
      priceIsTotal: editingHistoryItem.priceMode !== 'unit',
      isPromotion: Boolean(editingHistoryItem.isPromotion),
      originalPrice: editingHistoryItem.isPromotion ? parseMoneyDigits(editingHistoryItem.originalPriceDigits) : null
    });
    if (!saved) {
      Alert.alert('Erro', 'Não foi possível salvar os detalhes do produto.');
      return;
    }
    setItemDetailVisible(false);
    setEditingHistoryItem(null);
    loadHistory();
  };

  const handleDeleteHistoryItem = () => {
    if (!editingHistoryItem) return;
    Alert.alert('Remover produto', 'Remover este produto apenas desta visita?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const removed = await removeFromPurchaseHistory(editingHistoryItem.id);
          if (!removed) {
            Alert.alert('Erro', 'Não foi possível remover o produto.');
            return;
          }
          setItemDetailVisible(false);
          setEditingHistoryItem(null);
          loadHistory();
        }
      }
    ]);
  };

  const handleDeleteVisit = (group) => {
    Alert.alert('Excluir visita', `Excluir a compra inteira de ${group.marketName} em ${getGroupDateLabel(group.date)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir visita',
        style: 'destructive',
        onPress: async () => {
          const results = [];
          for (const item of group.items) results.push(await removeFromPurchaseHistory(item.id));
          if (results.every(Boolean)) {
            loadHistory();
          } else {
            Alert.alert('Erro', 'A visita não pôde ser excluída por completo.');
          }
        }
      }
    ]);
  };

  const handleOpenAddItem = (group) => {
    setAddItemContext(group);
    setNewHistoryItem({ name: '', brand: '', quantityDigits: '', unit: 'un', priceDigits: '', isPromotion: false, originalPriceDigits: '' });
    setAddItemVisible(true);
  };

  const handleSaveNewHistoryItem = async () => {
    const name = newHistoryItem.name?.trim();
    if (!name) {
      Alert.alert('Produto inválido', 'Informe o nome do produto.');
      return;
    }
    const quantity = parseQuantityInput(newHistoryItem.quantityDigits, newHistoryItem.unit);
    const reference = addItemContext?.items?.[0];
    const saved = await addToPurchaseHistory({
      name,
      brand: newHistoryItem.brand?.trim() || '',
      quantity: quantity > 0 ? quantity : null,
      unit: newHistoryItem.unit || 'un',
      price: parseMoneyDigits(newHistoryItem.priceDigits),
      priceMode: 'total',
      priceIsTotal: true,
      isPromotion: Boolean(newHistoryItem.isPromotion),
      originalPrice: newHistoryItem.isPromotion ? parseMoneyDigits(newHistoryItem.originalPriceDigits) : null,
      purchaseDate: reference?.purchaseDate || new Date().toISOString(),
      marketName: addItemContext?.marketName === 'Mercado não informado' ? null : addItemContext?.marketName || null,
      purchaseId: reference?.purchaseId || null,
      shoppingItemId: null
    });
    if (!saved) {
      Alert.alert('Erro', 'Não foi possível adicionar o produto à visita.');
      return;
    }
    setAddItemVisible(false);
    setAddItemContext(null);
    loadHistory();
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
    const ids = editingItem?.ids || (editingItem?.id ? [editingItem.id] : []);
    const saved = ids.length > 1
      ? await updatePurchaseHistoryItems(ids, { purchaseDate })
      : await updatePurchaseHistoryItem(ids[0], { purchaseDate });
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

  const getGroupDateLabel = (purchaseDate) => {
    const date = new Date(purchaseDate);
    return Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleDateString('pt-BR');
  };

  const groupedHistory = Object.values(filteredHistory.reduce((groups, item) => {
    const date = new Date(item.purchaseDate);
    const dateKey = Number.isNaN(date.getTime()) ? 'unknown-date' : date.toISOString().slice(0, 10);
    const marketName = item.marketName || item.storeName || 'Mercado não informado';
    const key = item.purchaseVisitId ? `visit:${item.purchaseVisitId}` : `${dateKey}|${marketName}`;
    if (!groups[key]) {
      groups[key] = { key, date: item.purchaseDate, marketName, items: [] };
    }
    groups[key].items.push(item);
    return groups;
  }, {})).sort((first, second) => new Date(second.date) - new Date(first.date));

  const toggleGroup = (key) => {
    setExpandedGroups(current => ({ ...current, [key]: !current[key] }));
  };

  const renderHistoryItem = (item) => (
    <TouchableOpacity key={item.id} style={styles.detailRow} onPress={() => handleOpenItemDetail(item)} accessibilityLabel={`Ver detalhes de ${item.name}`}>
      <View style={styles.detailCopy}>
        <Text style={styles.detailName}>{item.name}</Text>
        <Text style={styles.detailMeta}>
          {item.brand ? `${item.brand} · ` : ''}{item.quantity || '—'} {item.unit || ''}
          {item.isPromotion ? ' · Promoção' : ''}
        </Text>
      </View>
      <View style={styles.detailPriceCopy}>
        <Text style={styles.detailValue}>
          {item.price !== null && item.price !== undefined
            ? `R$ ${getItemTotal(item).toFixed(2).replace('.', ',')}`
            : 'A informar'}
        </Text>
        <Text style={styles.detailTapHint}>ver detalhes</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color="#777799" />
    </TouchableOpacity>
  );

  const renderHistoryGroup = ({ item: group }) => {
    const expanded = Boolean(expandedGroups[group.key]);
    const groupTotal = group.items.reduce((sum, historyItem) => sum + getItemTotal(historyItem), 0);
    return (
      <View style={styles.groupCard}>
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => toggleGroup(group.key)}
          accessibilityLabel={`${expanded ? 'Recolher' : 'Abrir'} compra de ${getGroupDateLabel(group.date)} no ${group.marketName}`}
          accessibilityState={{ expanded }}
        >
          <View style={styles.groupCopy}>
            <Text style={styles.groupDate}>{getGroupDateLabel(group.date)}</Text>
            <Text style={styles.groupMarket}>{group.marketName}</Text>
            <Text style={styles.groupSummary}>{group.items.length} {group.items.length === 1 ? 'item' : 'itens'} · R$ {groupTotal.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={styles.groupActions}>
            <TouchableOpacity accessibilityLabel={`Editar visita de ${getGroupDateLabel(group.date)} no ${group.marketName}`} onPress={() => handleOpenVisitEdit(group)}>
              <Ionicons name="create-outline" size={19} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={`Excluir visita de ${getGroupDateLabel(group.date)} no ${group.marketName}`} onPress={() => handleDeleteVisit(group)}>
              <Ionicons name="trash-outline" size={18} color="#ff7777" />
            </TouchableOpacity>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={21} color="#aaaac0" />
          </View>
        </TouchableOpacity>
        {expanded && (
          <View style={styles.groupDetails}>
            {group.items.map(renderHistoryItem)}
            <TouchableOpacity style={styles.addHistoryItemButton} onPress={() => handleOpenAddItem(group)}>
              <Ionicons name="add-circle-outline" size={19} color="#4CAF50" />
              <Text style={styles.addHistoryItemText}>Adicionar produto que faltou</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

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
          Total: R$ {getTotalFiltered().toFixed(2).replace('.', ',')}
        </Text>
      </View>

      {/* Lista agrupada por data e mercado */}
      {groupedHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>Nenhuma compra neste período</Text>
        </View>
      ) : (
        <FlatList
          data={groupedHistory}
          keyExtractor={(item) => item.key}
          renderItem={renderHistoryGroup}
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

      {/* Modal para editar a visita inteira */}
      <Modal
        visible={visitEditVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisitEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Editar visita ao mercado</Text>
            <Text style={styles.editHelper}>Ajuste os dados da nota inteira. Todos os produtos deste cartão serão atualizados juntos.</Text>
            <Text style={styles.modalLabel}>Mercado ou estabelecimento</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ex.: Bistek"
              placeholderTextColor="#8888aa"
              value={editingVisit?.marketName || ''}
              onChangeText={(marketName) => setEditingVisit({ ...editingVisit, marketName })}
            />
            <Text style={styles.modalLabel}>Data da compra</Text>
            <TextInput
              style={styles.formInput}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#8888aa"
              keyboardType="numbers-and-punctuation"
              value={editingVisit?.purchaseDate || ''}
              onChangeText={(purchaseDate) => setEditingVisit({ ...editingVisit, purchaseDate })}
            />
            <Text style={styles.modalLabel}>Corrigir uma nota cadastrada em outro dia</Text>
            <Text style={styles.editHelper}>Se estes produtos pertencem à mesma nota de outra visita, escolha o cartão abaixo. Eles serão unidos em uma única compra.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mergeScroll}>
              <TouchableOpacity style={[styles.mergeChip, !editingVisit?.mergeTargetKey && styles.mergeChipSelected]} onPress={() => setEditingVisit({ ...editingVisit, mergeTargetKey: null })}>
                <Text style={[styles.mergeChipText, !editingVisit?.mergeTargetKey && styles.mergeChipTextSelected]}>Não juntar</Text>
              </TouchableOpacity>
              {(editingVisit?.availableVisits || []).map(candidate => (
                <TouchableOpacity key={candidate.key} style={[styles.mergeChip, editingVisit?.mergeTargetKey === candidate.key && styles.mergeChipSelected]} onPress={() => setEditingVisit({ ...editingVisit, mergeTargetKey: candidate.key })}>
                  <Text style={[styles.mergeChipText, editingVisit?.mergeTargetKey === candidate.key && styles.mergeChipTextSelected]}>{getGroupDateLabel(candidate.date)} · {candidate.marketName} · {candidate.items.length} itens</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.editButtons}>
              <TouchableOpacity style={styles.cancelEditButton} onPress={() => setVisitEditVisible(false)}>
                <Text style={styles.cancelEditText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveEditButton} onPress={handleSaveVisitEdit}>
                <Text style={styles.saveEditText}>Salvar visita</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal com os detalhes editáveis de um produto */}
      <Modal
        visible={itemDetailVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setItemDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Detalhes do produto</Text>
            <Text style={styles.modalLabel}>Produto</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Nome do produto"
              placeholderTextColor="#8888aa"
              value={editingHistoryItem?.name || ''}
              onChangeText={(name) => setEditingHistoryItem({ ...editingHistoryItem, name })}
            />
            <Text style={styles.modalLabel}>Marca</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Opcional"
              placeholderTextColor="#8888aa"
              value={editingHistoryItem?.brand || ''}
              onChangeText={(brand) => setEditingHistoryItem({ ...editingHistoryItem, brand })}
            />
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={styles.modalLabel}>Quantidade</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ex.: 780"
                  placeholderTextColor="#8888aa"
                  keyboardType="number-pad"
                  value={formatQuantityDigits(editingHistoryItem?.quantityDigits, editingHistoryItem?.unit)}
                  onChangeText={(quantityDigits) => setEditingHistoryItem({ ...editingHistoryItem, quantityDigits: onlyDigits(quantityDigits) })}
                />
              </View>
              <View style={styles.formHalf}>
                <Text style={styles.modalLabel}>Unidade</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                  {UNITS.map(unit => (
                    <TouchableOpacity key={unit} style={[styles.unitChip, editingHistoryItem?.unit === unit && styles.unitChipSelected]} onPress={() => {
                      const previousUnit = editingHistoryItem?.unit || 'un';
                      const previousValue = parseQuantityInput(editingHistoryItem?.quantityDigits, previousUnit);
                      const nextValue = ['kg', 'g'].includes(previousUnit) && ['kg', 'g'].includes(unit)
                        ? (unit === 'kg' ? previousValue / 1000 : previousValue * 1000)
                        : ['L', 'mL'].includes(previousUnit) && ['L', 'mL'].includes(unit)
                          ? (unit === 'L' ? previousValue / 1000 : previousValue * 1000)
                          : previousValue;
                      setEditingHistoryItem({ ...editingHistoryItem, unit, quantityDigits: quantityDigitsFromValue(nextValue, unit), priceUnit: unit });
                    }}>
                  <Text style={[styles.unitChipText, editingHistoryItem?.unit === unit && styles.unitChipTextSelected]}>{unit}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.quantityHelper}>{editingHistoryItem?.unit === 'kg' ? 'Digite em gramas: 780 = 0,780 kg; 1700 = 1,700 kg.' : editingHistoryItem?.unit === 'g' ? 'Digite em gramas: 780 = 780 g.' : editingHistoryItem?.unit === 'L' ? 'Digite em mililitros: 1500 = 1,500 L.' : editingHistoryItem?.unit === 'mL' ? 'Digite em mililitros: 1500 = 1500 mL.' : 'Digite apenas números.'}</Text>
          </View>
            </View>
            <Text style={styles.modalLabel}>Como o preço foi registrado?</Text>
            <View style={styles.choiceRow}>
              <TouchableOpacity style={[styles.choiceButton, editingHistoryItem?.priceMode !== 'unit' && styles.choiceButtonSelected]} onPress={() => setEditingHistoryItem({ ...editingHistoryItem, priceMode: 'total' })}>
                <Text style={[styles.choiceText, editingHistoryItem?.priceMode !== 'unit' && styles.choiceTextSelected]}>Total pago</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.choiceButton, editingHistoryItem?.priceMode === 'unit' && styles.choiceButtonSelected]} onPress={() => setEditingHistoryItem({ ...editingHistoryItem, priceMode: 'unit' })}>
                <Text style={[styles.choiceText, editingHistoryItem?.priceMode === 'unit' && styles.choiceTextSelected]}>Preço unitário</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>{editingHistoryItem?.priceMode === 'unit' ? 'Preço por unidade/kg/L' : 'Valor total pago pelo item'}</Text>
            <TextInput
              style={styles.formInput}
              placeholder="0,00"
              placeholderTextColor="#8888aa"
              keyboardType="number-pad"
              value={formatMoneyDigits(editingHistoryItem?.priceDigits)}
              onChangeText={(value) => setEditingHistoryItem({ ...editingHistoryItem, priceDigits: onlyDigits(value) })}
            />
            {editingHistoryItem?.priceMode === 'unit' && (
              <>
                <Text style={styles.modalLabel}>Preço referente a</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                  {['un', 'kg', 'g', 'L', 'mL'].map(priceUnit => (
                    <TouchableOpacity key={priceUnit} style={[styles.unitChip, editingHistoryItem?.priceUnit === priceUnit && styles.unitChipSelected]} onPress={() => setEditingHistoryItem({ ...editingHistoryItem, priceUnit })}>
                      <Text style={[styles.unitChipText, editingHistoryItem?.priceUnit === priceUnit && styles.unitChipTextSelected]}>{priceUnit}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <TouchableOpacity style={styles.promotionToggle} onPress={() => setEditingHistoryItem({ ...editingHistoryItem, isPromotion: !editingHistoryItem?.isPromotion })}>
              <Ionicons name={editingHistoryItem?.isPromotion ? 'checkbox' : 'square-outline'} size={22} color={editingHistoryItem?.isPromotion ? '#4CAF50' : '#8888aa'} />
              <Text style={styles.promotionToggleText}>Foi uma promoção</Text>
            </TouchableOpacity>
            {editingHistoryItem?.isPromotion && (
              <>
                <Text style={styles.modalLabel}>Preço original antes da promoção</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="0,00"
                  placeholderTextColor="#8888aa"
                  keyboardType="number-pad"
                  value={formatMoneyDigits(editingHistoryItem?.originalPriceDigits)}
                  onChangeText={(value) => setEditingHistoryItem({ ...editingHistoryItem, originalPriceDigits: onlyDigits(value) })}
                />
              </>
            )}
            <View style={styles.editButtons}>
              <TouchableOpacity style={styles.deleteItemButton} onPress={handleDeleteHistoryItem}>
                <Text style={styles.deleteItemText}>Excluir item</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveEditButton} onPress={handleSaveItemDetail}>
                <Text style={styles.saveEditText}>Salvar produto</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal para adicionar um produto faltante à visita */}
      <Modal
        visible={addItemVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddItemVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Adicionar produto à visita</Text>
            <Text style={styles.editHelper}>Use esta opção para completar a compra depois de conferir a nota.</Text>
            <Text style={styles.modalLabel}>Produto</Text>
            <TextInput style={styles.formInput} placeholder="Ex.: Banana" placeholderTextColor="#8888aa" value={newHistoryItem.name} onChangeText={(name) => setNewHistoryItem({ ...newHistoryItem, name })} />
            <Text style={styles.modalLabel}>Marca</Text>
            <TextInput style={styles.formInput} placeholder="Opcional" placeholderTextColor="#8888aa" value={newHistoryItem.brand} onChangeText={(brand) => setNewHistoryItem({ ...newHistoryItem, brand })} />
            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={styles.modalLabel}>Quantidade</Text>
                <TextInput style={styles.formInput} placeholder="Ex.: 780" placeholderTextColor="#8888aa" keyboardType="number-pad" value={formatQuantityDigits(newHistoryItem.quantityDigits, newHistoryItem.unit)} onChangeText={(quantityDigits) => setNewHistoryItem({ ...newHistoryItem, quantityDigits: onlyDigits(quantityDigits) })} />
              </View>
              <View style={styles.formHalf}>
                <Text style={styles.modalLabel}>Unidade</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                  {UNITS.map(unit => (
                    <TouchableOpacity key={unit} style={[styles.unitChip, newHistoryItem.unit === unit && styles.unitChipSelected]} onPress={() => setNewHistoryItem({ ...newHistoryItem, unit })}>
                      <Text style={[styles.unitChipText, newHistoryItem.unit === unit && styles.unitChipTextSelected]}>{unit}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.quantityHelper}>{newHistoryItem.unit === 'kg' ? 'Digite em gramas: 780 = 0,780 kg; 1700 = 1,700 kg.' : newHistoryItem.unit === 'g' ? 'Digite em gramas: 780 = 780 g.' : 'Digite apenas números.'}</Text>
              </View>
            </View>
            <Text style={styles.modalLabel}>Valor total pago pelo item</Text>
            <TextInput style={styles.formInput} placeholder="0,00" placeholderTextColor="#8888aa" keyboardType="number-pad" value={formatMoneyDigits(newHistoryItem.priceDigits)} onChangeText={(value) => setNewHistoryItem({ ...newHistoryItem, priceDigits: onlyDigits(value) })} />
            <TouchableOpacity style={styles.promotionToggle} onPress={() => setNewHistoryItem({ ...newHistoryItem, isPromotion: !newHistoryItem.isPromotion })}>
              <Ionicons name={newHistoryItem.isPromotion ? 'checkbox' : 'square-outline'} size={22} color={newHistoryItem.isPromotion ? '#4CAF50' : '#8888aa'} />
              <Text style={styles.promotionToggleText}>Foi uma promoção</Text>
            </TouchableOpacity>
            {newHistoryItem.isPromotion && <TextInput style={styles.formInput} placeholder="Preço original: 0,00" placeholderTextColor="#8888aa" keyboardType="number-pad" value={formatMoneyDigits(newHistoryItem.originalPriceDigits)} onChangeText={(value) => setNewHistoryItem({ ...newHistoryItem, originalPriceDigits: onlyDigits(value) })} />}
            <View style={styles.editButtons}>
              <TouchableOpacity style={styles.cancelEditButton} onPress={() => setAddItemVisible(false)}>
                <Text style={styles.cancelEditText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveEditButton} onPress={handleSaveNewHistoryItem}>
                <Text style={styles.saveEditText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  listContent: { padding: 12 },
  groupCard: { backgroundColor: '#1a1a2e', borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#2a2a4e', overflow: 'hidden' },
  groupHeader: { minHeight: 76, paddingVertical: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupCopy: { flex: 1, paddingRight: 10 },
  groupDate: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  groupMarket: { color: '#4CAF50', fontSize: 13, fontWeight: '600', marginTop: 2 },
  groupSummary: { color: '#8888aa', fontSize: 12, marginTop: 3 },
  groupActions: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  groupDetails: { borderTopWidth: 1, borderTopColor: '#2a2a4e', paddingHorizontal: 13 },
  detailRow: { minHeight: 56, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#25253b' },
  detailCopy: { flex: 1, paddingRight: 8 },
  detailName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  detailMeta: { color: '#8888aa', fontSize: 11, marginTop: 2 },
  detailPriceCopy: { minWidth: 82, alignItems: 'flex-end', marginRight: 7 },
  detailValue: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'right' },
  detailTapHint: { color: '#777799', fontSize: 9, marginTop: 2 },
  detailActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 10 },
  addHistoryItemButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#25253b' },
  addHistoryItemText: { color: '#4CAF50', fontSize: 13, fontWeight: '600', marginLeft: 7 },
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
  formInput: { backgroundColor: '#2a2a4e', color: '#fff', paddingHorizontal: 13, paddingVertical: 11, borderRadius: 10, fontSize: 16, marginBottom: 4 },
  quantityHelper: { color: '#777799', fontSize: 10, lineHeight: 14, marginTop: 3, marginBottom: 4 },
  mergeScroll: { marginBottom: 6 },
  mergeChip: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 9, backgroundColor: '#2a2a4e', marginRight: 7, maxWidth: 245 },
  mergeChipSelected: { backgroundColor: '#357c38' },
  mergeChipText: { color: '#aaaac0', fontSize: 12, fontWeight: '600' },
  mergeChipTextSelected: { color: '#fff' },
  formRow: { flexDirection: 'row', gap: 10 },
  formHalf: { flex: 1, minWidth: 0 },
  unitScroll: { marginBottom: 4 },
  unitChip: { paddingHorizontal: 10, paddingVertical: 9, borderRadius: 9, backgroundColor: '#2a2a4e', marginRight: 6 },
  unitChipSelected: { backgroundColor: '#4CAF50' },
  unitChipText: { color: '#aaaac0', fontSize: 12, fontWeight: '600' },
  unitChipTextSelected: { color: '#fff' },
  choiceRow: { flexDirection: 'row', gap: 8, marginBottom: 3 },
  choiceButton: { flex: 1, paddingVertical: 10, borderRadius: 9, backgroundColor: '#2a2a4e', alignItems: 'center' },
  choiceButtonSelected: { backgroundColor: '#357c38' },
  choiceText: { color: '#aaaac0', fontWeight: '600', fontSize: 12 },
  choiceTextSelected: { color: '#fff' },
  promotionToggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  promotionToggleText: { color: '#fff', marginLeft: 8, fontSize: 14 },
  deleteItemButton: { flex: 1, backgroundColor: '#51252a', padding: 14, borderRadius: 10, alignItems: 'center' },
  deleteItemText: { color: '#ff9b9b', fontWeight: 'bold' },
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