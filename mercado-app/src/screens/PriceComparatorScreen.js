import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UNITS } from '../utils/storage';

const createOption = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: '',
  price: '',
  quantity: '1',
  unit: 'un'
});

const parseNumber = (value) => {
  const parsed = Number.parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeQuantity = (quantity, unit) => {
  const amount = parseNumber(quantity);

  if (!amount) return null;

  if (unit === 'kg') return { amount: amount * 1000, group: 'massa', baseUnit: 'g' };
  if (unit === 'g') return { amount, group: 'massa', baseUnit: 'g' };
  if (unit === 'L') return { amount: amount * 1000, group: 'volume', baseUnit: 'mL' };
  if (unit === 'mL') return { amount, group: 'volume', baseUnit: 'mL' };
  if (unit === 'dz') return { amount: amount * 12, group: 'unidade', baseUnit: 'un' };
  if (unit === 'un') return { amount, group: 'unidade', baseUnit: 'un' };
  if (unit === 'm') return { amount, group: 'comprimento', baseUnit: 'm' };

  return { amount, group: unit, baseUnit: unit };
};

const formatCurrency = (value) => `R$ ${value.toFixed(2).replace('.', ',')}`;

const formatUnitPrice = (unitPrice, group, baseUnit) => {
  if (group === 'massa') return `${formatCurrency(unitPrice * 1000)}/kg`;
  if (group === 'volume') return `${formatCurrency(unitPrice * 1000)}/L`;
  return `${formatCurrency(unitPrice)}/${baseUnit}`;
};

export default function PriceComparatorScreen() {
  const [productName, setProductName] = useState('');
  const [options, setOptions] = useState([createOption(), createOption()]);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState('');

  const updateOption = (id, field, value) => {
    setOptions(current => current.map(option =>
      option.id === id ? { ...option, [field]: value } : option
    ));
    setComparison(null);
    setError('');
  };

  const addOption = () => {
    setOptions(current => [...current, createOption()]);
    setComparison(null);
    setError('');
  };

  const removeOption = (id) => {
    if (options.length <= 2) return;
    setOptions(current => current.filter(option => option.id !== id));
    setComparison(null);
    setError('');
  };

  const compareOptions = () => {
    const prepared = options.map((option, index) => {
      const price = parseNumber(option.price);
      const normalized = normalizeQuantity(option.quantity, option.unit);

      if (!price || !normalized) return null;

      return {
        ...option,
        displayName: option.label.trim() || `Opção ${index + 1}`,
        price,
        unitPrice: price / normalized.amount,
        ...normalized
      };
    });

    if (prepared.some(option => !option)) {
      setComparison(null);
      setError('Preencha o preço e a quantidade de todas as opções para comparar.');
      return;
    }

    const validOptions = prepared.filter(Boolean);
    const group = validOptions[0].group;
    const compatible = validOptions.every(option => option.group === group);

    if (!compatible) {
      setComparison(null);
      setError('Use unidades compatíveis na mesma comparação, como kg e g, ou L e mL.');
      return;
    }

    const ordered = [...validOptions].sort((first, second) => first.unitPrice - second.unitPrice);
    const winner = ordered[0];
    const runnerUp = ordered[1];
    const savings = runnerUp ? runnerUp.unitPrice - winner.unitPrice : 0;

    setError('');
    setComparison({ winner, ordered, savings });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.introCard}>
        <View style={styles.introIcon}>
          <Ionicons name="git-compare-outline" size={24} color="#4CAF50" />
        </View>
        <View style={styles.introTextContainer}>
          <Text style={styles.introTitle}>Compare o custo por unidade</Text>
          <Text style={styles.introText}>
            Informe as opções, seus preços e tamanhos. O app normaliza kg/g, L/mL e unidade/dúzia para indicar o melhor custo-benefício.
          </Text>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Produto comparado</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: Café, leite em pó ou detergente"
          placeholderTextColor="#8888aa"
          value={productName}
          onChangeText={setProductName}
        />
      </View>

      {options.map((option, index) => (
        <View key={option.id} style={styles.optionCard}>
          <View style={styles.optionHeader}>
            <Text style={styles.optionTitle}>Opção {index + 1}</Text>
            {options.length > 2 ? (
              <TouchableOpacity accessibilityLabel={`Remover opção ${index + 1}`} onPress={() => removeOption(option.id)}>
                <Ionicons name="trash-outline" size={20} color="#F44336" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Marca, loja ou observação</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Marca A, Mercado X"
              placeholderTextColor="#8888aa"
              value={option.label}
              onChangeText={(value) => updateOption(option.id, 'label', value)}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, styles.halfField, styles.leftField]}>
              <Text style={styles.label}>Preço (R$)</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor="#8888aa"
                value={option.price}
                keyboardType="decimal-pad"
                onChangeText={(value) => updateOption(option.id, 'price', value)}
              />
            </View>
            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.label}>Quantidade</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor="#8888aa"
                value={option.quantity}
                keyboardType="decimal-pad"
                onChangeText={(value) => updateOption(option.id, 'quantity', value)}
              />
            </View>
          </View>

          <Text style={styles.label}>Unidade</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitsScroll}>
            <View style={styles.unitsContainer}>
              {UNITS.map(unit => (
                <TouchableOpacity
                  key={unit}
                  style={[styles.unitChip, option.unit === unit && styles.unitChipActive]}
                  onPress={() => updateOption(option.id, 'unit', unit)}
                >
                  <Text style={[styles.unitChipText, option.unit === unit && styles.unitChipTextActive]}>{unit}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      ))}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.addButton} onPress={addOption}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addButtonText}>Adicionar opção</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.compareButton} onPress={compareOptions}>
          <Ionicons name="analytics-outline" size={21} color="#0f0f1a" />
          <Text style={styles.compareButtonText}>Comparar</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {comparison ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Ionicons name="trophy-outline" size={24} color="#FFB300" />
            <Text style={styles.resultTitle}>Melhor custo-benefício</Text>
          </View>
          {productName.trim() ? <Text style={styles.productCompared}>{productName.trim()}</Text> : null}
          <Text style={styles.winnerName}>{comparison.winner.displayName}</Text>
          <Text style={styles.winnerPrice}>
            {formatUnitPrice(comparison.winner.unitPrice, comparison.winner.group, comparison.winner.baseUnit)}
          </Text>
          {comparison.savings > 0 ? (
            <Text style={styles.savingsText}>
              Economia de {formatUnitPrice(comparison.savings, comparison.winner.group, comparison.winner.baseUnit)} em relação à segunda melhor opção.
            </Text>
          ) : null}

          <View style={styles.resultList}>
            {comparison.ordered.map((option, index) => (
              <View key={option.id} style={styles.resultRow}>
                <Text style={styles.resultPosition}>{index + 1}</Text>
                <Text style={styles.resultOptionName}>{option.displayName}</Text>
                <Text style={styles.resultOptionPrice}>
                  {formatUnitPrice(option.unitPrice, option.group, option.baseUnit)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.tipCard}>
        <Ionicons name="bulb-outline" size={20} color="#FFB300" />
        <Text style={styles.tipText}>
          Dica: use kg para frutas, carnes e grãos; g para embalagens menores; L ou mL para bebidas e produtos líquidos.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 16, paddingBottom: 32 },
  introCard: { flexDirection: 'row', backgroundColor: '#1a1a2e', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#2d5540', marginBottom: 20 },
  introIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#183d2a', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  introTextContainer: { flex: 1 },
  introTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  introText: { color: '#aaaac0', fontSize: 13, lineHeight: 18 },
  fieldGroup: { marginBottom: 12 },
  label: { color: '#aaaac0', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#1a1a2e', borderColor: '#2a2a3e', borderWidth: 1, color: '#fff', paddingHorizontal: 12, paddingVertical: 11, borderRadius: 9, fontSize: 15 },
  optionCard: { backgroundColor: '#171727', borderColor: '#2a2a3e', borderWidth: 1, padding: 14, borderRadius: 14, marginBottom: 12 },
  optionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  optionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  row: { flexDirection: 'row' },
  halfField: { flex: 1 },
  leftField: { marginRight: 8 },
  unitsScroll: { marginBottom: 2 },
  unitsContainer: { flexDirection: 'row' },
  unitChip: { backgroundColor: '#2a2a3e', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 7, marginRight: 7 },
  unitChipActive: { backgroundColor: '#4CAF50' },
  unitChipText: { color: '#aaaac0', fontSize: 13, fontWeight: '600' },
  unitChipTextActive: { color: '#fff' },
  buttonRow: { flexDirection: 'row', marginTop: 4, marginBottom: 12 },
  addButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#2a2a3e', paddingVertical: 14, borderRadius: 10, marginRight: 8 },
  addButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 6 },
  compareButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 10, marginLeft: 8 },
  compareButtonText: { color: '#0f0f1a', fontWeight: 'bold', marginLeft: 6 },
  errorText: { color: '#FF8A80', textAlign: 'center', marginBottom: 12, lineHeight: 18 },
  resultCard: { backgroundColor: '#183d2a', borderColor: '#4CAF50', borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 4 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  resultTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginLeft: 8 },
  productCompared: { color: '#b3dcbf', fontSize: 13, marginBottom: 8 },
  winnerName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  winnerPrice: { color: '#8DE99B', fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  savingsText: { color: '#d1f3d6', fontSize: 12, marginTop: 8, lineHeight: 17 },
  resultList: { borderTopColor: '#39724a', borderTopWidth: 1, marginTop: 14, paddingTop: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  resultPosition: { color: '#b3dcbf', width: 22, fontWeight: 'bold' },
  resultOptionName: { color: '#fff', flex: 1, fontSize: 14 },
  resultOptionPrice: { color: '#d1f3d6', fontSize: 13, fontWeight: '600' },
  tipCard: { flexDirection: 'row', backgroundColor: '#1a1a2e', padding: 14, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#FFB300', marginTop: 16 },
  tipText: { color: '#aaaac0', flex: 1, marginLeft: 10, fontSize: 13, lineHeight: 18 }
});
