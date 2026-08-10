import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, formatCurrency } from '../utils/helpers';
import { savePurchase } from '../utils/storage';

export default function AddPurchase({ navigation }) {
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('un');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert('Erro', 'Digite o nome do produto');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Erro', 'Digite um valor válido para o preço');
      return;
    }

    try {
      await savePurchase({
        productName: productName.trim(),
        price: parseFloat(price),
        quantity: quantity ? parseFloat(quantity) : 1,
        unit,
        categoryId: selectedCategory,
        date,
      });

      Alert.alert('Sucesso', 'Compra registrada com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a compra. Tente novamente.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova Compra</Text>
      </View>

      <View style={styles.form}>
        {/* Nome do Produto */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome do Produto</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="cart" size={20} color="#8888aa" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ex: Papel Higiênico"
              placeholderTextColor="#666688"
              value={productName}
              onChangeText={setProductName}
            />
          </View>
        </View>

        {/* Valor */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Valor Total (R$)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="cash" size={20} color="#8888aa" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor="#666688"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Quantidade e Unidade */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Quantidade</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="layers" size={20} color="#8888aa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor="#666688"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Unidade</Text>
            <TouchableOpacity 
              style={styles.pickerContainer}
              onPress={() => {
                const units = ['un', 'kg', 'g', 'l', 'ml', 'm'];
                const currentIndex = units.indexOf(unit);
                const nextIndex = (currentIndex + 1) % units.length;
                setUnit(units[nextIndex]);
              }}
            >
              <Text style={styles.pickerValue}>{unit}</Text>
              <Ionicons name="chevron-down" size={20} color="#8888aa" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Data */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Data da Compra</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="calendar" size={20} color="#8888aa" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#666688"
              value={date}
              onChangeText={setDate}
            />
          </View>
        </View>

        {/* Categoria */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoriesContainer}>
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
                    size={18} 
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
            </View>
          </ScrollView>
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="save" size={24} color="#1a1a2e" />
          <Text style={styles.saveButtonText}>Salvar Compra</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#1a1a2e',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#8888aa',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    padding: 14,
    color: '#ffffff',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pickerValue: {
    color: '#ffffff',
    fontSize: 16,
  },
  categoriesContainer: {
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  categoryChipText: {
    color: '#8888aa',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  saveButtonText: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
