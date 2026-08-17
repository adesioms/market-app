import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import HistoryScreen from '../screens/HistoryScreen';
import PriceComparatorScreen from '../screens/PriceComparatorScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Lista"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'ellipse-outline';
          if (route.name === 'Lista') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Histórico') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Comparar') {
            iconName = 'git-compare-outline';
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
        name="Lista"
        component={ShoppingListScreen}
        options={{ title: 'Minha Lista', headerShown: false }}
      />
      <Tab.Screen
        name="Histórico"
        component={HistoryScreen}
        options={{ title: 'Histórico' }}
      />
      <Tab.Screen
        name="Comparar"
        component={PriceComparatorScreen}
        options={{ title: 'Comparar preços' }}
      />
    </Tab.Navigator>
  );
}
