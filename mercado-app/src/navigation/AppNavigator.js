import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import Dashboard from '../screens/Dashboard';
import ShoppingList from '../screens/ShoppingList';
import AddPurchase from '../screens/AddPurchase';
import History from '../screens/History';
import Comparator from '../screens/Comparator';
import MasterListScreen from '../screens/MasterListScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={Dashboard} />
      <Stack.Screen 
        name="AddPurchase" 
        component={AddPurchase}
        options={{ title: 'Nova Compra' }}
      />
      <Stack.Screen 
        name="Comparator" 
        component={Comparator}
        options={{ title: 'Comparador' }}
      />
    </Stack.Navigator>
  );
}

function ShoppingListStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShoppingListMain" component={ShoppingList} />
    </Stack.Navigator>
  );
}

function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HistoryMain" component={History} />
    </Stack.Navigator>
  );
}

function MasterListStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MasterListMain" component={MasterListScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ListaCompras') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Mestra') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'Historico') {
            iconName = focused ? 'list' : 'list-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#8888aa',
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: '#2a2a3e',
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{ title: 'Início' }}
      />
      <Tab.Screen 
        name="ListaCompras" 
        component={ShoppingListStack}
        options={{ title: 'Lista' }}
      />
      <Tab.Screen 
        name="Mestra" 
        component={MasterListStack}
        options={{ title: 'Mestra' }}
      />
      <Tab.Screen 
        name="Historico" 
        component={HistoryStack}
        options={{ title: 'Histórico' }}
      />
    </Tab.Navigator>
  );
}
