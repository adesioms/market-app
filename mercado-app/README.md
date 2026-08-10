# Mercado App - Controle de Gastos de Mercado

Um aplicativo mobile moderno para Android que ajuda você a controlar suas compras mensais do mercado.

## Funcionalidades

### 📊 Dashboard Inicial
- **Total gasto no mês**: Visualize rapidamente quanto você gastou no mês atual
- **Gráfico de pizza**: Veja a distribuição de gastos por categoria
- **Ícones e estatísticas**: Informações rápidas sobre suas compras

### 🛒 Adicionar Compras
Registre suas compras com os seguintes campos:
- Nome do produto/serviço
- Valor (para comparação futura)
- Data da compra
- Categoria pré-definida
- Quantidade e unidade (un, kg, g, l, ml, m)

### 📜 Histórico de Compras
- Listagem completa de todas as compras
- **Filtragem por mês**: Selecione entre os últimos 6 meses
- **Filtragem por categoria**: Visualize gastos por categoria específica
- Opção de deletar compras

### ⚖️ Comparador de Produtos (Funcionalidade Especial!)
Compare produtos similares para encontrar o melhor custo-benefício automaticamente:

**Exemplos de uso:**
- **Papel higiênico**: Compare pacotes de 16 unidades de 30m vs 15 unidades de 60m
- **Batata frita**: Descubra se vale mais pena comprar 3 pacotes de 30g ou 1 pacote de 90g
- O app calcula automaticamente o preço por unidade/metro/grama e indica a melhor opção!

## Categorias Pré-definidas

1. 🍽️ **Alimentos** (Verde)
2. 🥤 **Bebidas** (Azul)
3. 🧹 **Limpeza** (Laranja)
4. 🚿 **Higiene** (Rosa)
5. 🍞 **Padaria** (Marrom)
6. 🥩 **Açougue** (Vermelho)
7. 🥬 **Hortifruti** (Verde claro)
8. 🛍️ **Outros** (Cinza)

## Visual e Design

- **Tema escuro**: Interface moderna e confortável para os olhos
- **Cores**: 
  - Fundo: `#0f0f1a` (azul muito escuro)
  - Cards: `#1a1a2e` (azul escuro)
  - Destaque: `#4CAF50` (verde)
  - Texto secundário: `#8888aa` (cinza azulado)
- **Ícones**: Material Icons do Expo

## Tecnologias Utilizadas

- **React Native** com **Expo**
- **React Navigation**: Navegação entre telas
- **AsyncStorage**: Armazenamento local (sem necessidade de login)
- **react-native-chart-kit**: Gráficos visuais
- **Sem backend**: Todos os dados são armazenados localmente no dispositivo

## Como Usar

### Instalando no seu dispositivo Android

1. **Instale o Expo Go** na Play Store do seu Android
2. **Clone ou baixe** este projeto
3. **Instale as dependências**:
   ```bash
   cd mercado-app
   npm install
   ```
4. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm start
   ```
5. **Escaneie o QR Code** com o Expo Go no seu celular

### Estrutura do Projeto

```
mercado-app/
├── App.js                 # Componente principal
├── app.json              # Configurações do Expo
├── package.json          # Dependências do projeto
├── assets/               # Imagens e ícones
└── src/
    ├── screens/
    │   ├── Dashboard.js      # Tela inicial
    │   ├── AddPurchase.js    # Adicionar compra
    │   ├── History.js        # Histórico
    │   └── Comparator.js     # Comparador de produtos
    ├── navigation/
    │   └── AppNavigator.js   # Navegação
    └── utils/
        ├── helpers.js        # Funções utilitárias
        └── storage.js        # Armazenamento local
```

## Funcionalidades do Comparador

O comparador é inteligente e ajuda você a economizar:

1. **Adicione múltiplos produtos** similares
2. **Insira preço e quantidade** de cada um
3. **Selecione a unidade** (unidades, kg, gramas, metros, etc.)
4. **O app calcula automaticamente** o preço por unidade
5. **Receba a recomendação** do melhor custo-benefício

### Exemplo Prático

**Situação**: Você está comprando papel higiênico e encontra:
- Pacote A: R$ 20,00 com 16 rolos de 30m (480m total)
- Pacote B: R$ 25,00 com 15 rolos de 60m (900m total)

**O comparador vai calcular**:
- Pacote A: R$ 0,0417 por metro
- Pacote B: R$ 0,0278 por metro ✅ **Melhor opção!**

## Sem Login

Este app não requer cadastro ou login. Todos os dados são armazenados localmente no seu dispositivo, garantindo sua privacidade.

## Próximas Melhorias (Sugestões)

- [ ] Exportar relatórios em PDF/Excel
- [ ] Definir orçamento mensal
- [ ] Alertas quando ultrapassar o orçamento
- [ ] Lista de compras pendentes
- [ ] Compartilhamento de lista com familiares
- [ ] Histórico de preços por produto
- [ ] Sugestões baseadas em compras anteriores

---

**Desenvolvido com ❤️ para ajudar nas compras do mês!**
