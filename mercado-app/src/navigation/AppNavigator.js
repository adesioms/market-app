import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import MasterListScreen from '../screens/MasterListScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Início') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Lista') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Mestra') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'Histórico') {
            iconName = focused ? 'time' : 'time-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#8888aa',
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: '#2a2a3e',
        },
        headerStyle: {
          backgroundColor: '#0f0f1a',
        },
        headerTintColor: '#fff',
      })}
    >
      <Tab.Screen 
        name="Início" 
        component={DashboardScreen}
        options={{ title: 'Início' }}
      />
      <Tab.Screen 
        name="Lista" 
        component={ShoppingListScreen}
        options={{ title: 'Lista de Compras' }}
      />
      <Tab.Screen 
        name="Mestra" 
        component={MasterListScreen}
        options={{ title: 'Lista Mestra' }}
      />
      <Tab.Screen 
        name="Histórico" 
        component={HistoryScreen}
        options={{ title: 'Histórico' }}
      />
    </Tab.Navigator>
  );
}
