import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, findBestDeal } from '../utils/helpers';

export default function Comparator({ navigation }) {
  const [productName, setProductName] = useState('');
  const [products, setProducts] = useState([
    { id: '1', name: '', price: '', quantity: '', unit: 'un' },
  ]);

  const addProduct = () => {
    setProducts([
      ...products,
      { id: Date.now().toString(), name: '', price: '', quantity: '', unit: 'un' },
    ]);
  };

  const removeProduct = (id) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    } else {
      Alert.alert('Atenção', 'É necessário pelo menos um produto para comparar');
    }
  };

  const updateProduct = (id, field, value) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleCompare = () => {
    const validProducts = products.filter(
      p => p.name.trim() && p.price && parseFloat(p.price) > 0 && p.quantity && parseFloat(p.quantity) > 0
    );

    if (validProducts.length < 2) {
      Alert.alert('Atenção', 'Adicione pelo menos 2 produtos válidos para comparar');
      return;
    }

    const result = findBestDeal(validProducts);
    
    if (result) {
      Alert.alert(
        'Melhor Opção',
        `Produto: ${result.product.name}\nPreço por unidade: ${formatCurrency(result.unitPrice)}\n\nEste é o melhor custo-benefício!`,
        [{ text: 'OK' }]
      );
    }
  };

  const units = ['un', 'kg', 'g', 'l', 'ml', 'm', 'cm'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comparador de Produtos</Text>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color="#2196F3" />
        <Text style={styles.infoText}>
          Compare produtos similares para encontrar o melhor custo-benefício. 
          O app calcula automaticamente o preço por unidade!
        </Text>
      </View>

      {/* Nome do Produto (opcional) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nome do Produto (opcional)</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="search" size={20} color="#8888aa" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Ex: Papel Higiênico"
            placeholderTextColor="#666688"
            value={productName}
            onChangeText={setProductName}
          />
        </View>
      </View>

      {/* Lista de Produtos */}
      {products.map((product, index) => (
        <View key={product.id} style={styles.productCard}>
          <View style={styles.productHeader}>
            <Text style={styles.productNumber}>Produto {index + 1}</Text>
            <TouchableOpacity onPress={() => removeProduct(product.id)}>
              <Ionicons name="close-circle" size={24} color="#F44336" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.smallInput}
              placeholder="Ex: Pacote A"
              placeholderTextColor="#666688"
              value={product.name}
              onChangeText={(value) => updateProduct(product.id, 'name', value)}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Preço (R$)</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="0,00"
                placeholderTextColor="#666688"
                value={product.price}
                onChangeText={(value) => updateProduct(product.id, 'price', value)}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Quantidade</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="1"
                placeholderTextColor="#666688"
                value={product.quantity}
                onChangeText={(value) => updateProduct(product.id, 'quantity', value)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Unidade</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.unitsContainer}>
                {units.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitChip,
                      product.unit === unit && styles.unitChipActive,
                    ]}
                    onPress={() => updateProduct(product.id, 'unit', unit)}
                  >
                    <Text
                      style={[
                        styles.unitChipText,
                        product.unit === unit && styles.unitChipTextActive,
                      ]}
                    >
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {product.price && product.quantity && (
            <View style={styles.unitPriceDisplay}>
              <Text style={styles.unitPriceLabel}>Preço por {product.unit}:</Text>
              <Text style={styles.unitPriceValue}>
                {formatCurrency(parseFloat(product.price) / parseFloat(product.quantity))}
              </Text>
            </View>
          )}
        </View>
      ))}

      {/* Botões */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.addButton} onPress={addProduct}>
          <Ionicons name="add" size={24} color="#ffffff" />
          <Text style={styles.addButtonText}>Adicionar Produto</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.compareButton} onPress={handleCompare}>
          <Ionicons name="scale" size={24} color="#1a1a2e" />
          <Text style={styles.compareButtonText}>Comparar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Dica: Para papel higiênico, compare o preço por metro. 
          Para batata frita, compare o preço por grama.
        </Text>
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
  infoCard: {
    flexDirection: 'row',
    margin: 16,
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  infoText: {
    flex: 1,
    color: '#8888aa',
    fontSize: 13,
    marginLeft: 12,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#8888aa',
    fontSize: 12,
    marginBottom: 6,
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
    padding: 12,
    color: '#ffffff',
    fontSize: 15,
  },
  smallInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    padding: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
  },
  productCard: {
    margin: 12,
    padding: 14,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productNumber: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  unitsContainer: {
    flexDirection: 'row',
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2a2a3e',
    marginRight: 6,
  },
  unitChipActive: {
    backgroundColor: '#4CAF50',
  },
  unitChipText: {
    color: '#8888aa',
    fontSize: 12,
    fontWeight: '500',
  },
  unitChipTextActive: {
    color: '#ffffff',
  },
  unitPriceDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    padding: 10,
    backgroundColor: '#0f0f1a',
    borderRadius: 8,
  },
  unitPriceLabel: {
    color: '#8888aa',
    fontSize: 13,
  },
  unitPriceValue: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 12,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a3e',
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  compareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 8,
  },
  compareButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    margin: 16,
    padding: 14,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  footerText: {
    color: '#8888aa',
    fontSize: 13,
    lineHeight: 18,
  },
});
