import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useOrderStore } from '../../state/orderStore';
import { useComplaintStore } from '../../state/complaintStore';

export default function TabLayout() {
  const { orders } = useOrderStore();
  const { getActiveComplaintsCount } = useComplaintStore();

  const activeOrdersCount = orders.filter(
    (o) => o.status === 'New' || o.status === 'Preparing' || o.status === 'Ready'
  ).length;

  const activeComplaintsCount = getActiveComplaintsCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E8C547',
        tabBarInactiveTintColor: '#8E8E8E',
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#1A1A1A',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 76 : 56,
          paddingBottom: Platform.OS === 'ios' ? 14 : 4,
          paddingTop: 3,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontFamily: 'Urbanist-Bold',
          fontWeight: '700',
          marginTop: -2,
        },
      }}
    >
      {/* TAB 1: HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />

      {/* TAB 2: LIVE ORDERS */}
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Live Orders',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              {activeOrdersCount > 0 && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{activeOrdersCount}</Text>
                </View>
              )}
              <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* TAB 3: MENU */}
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={22} color={color} />
          ),
        }}
      />

      {/* TAB 4: COMPLAINTS */}
      <Tabs.Screen
        name="complaints"
        options={{
          title: 'Complaints',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              {activeComplaintsCount > 0 && (
                <View style={[styles.badgePill, { backgroundColor: '#EF4444' }]}>
                  <Text style={[styles.badgePillText, { color: '#FFFFFF' }]}>{activeComplaintsCount}</Text>
                </View>
              )}
              <Ionicons name={focused ? 'alert-circle' : 'alert-circle-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* TAB 5: MORE */}
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          ),
        }}
      />

      {/* HIDE LEGACY PROFILE FROM TAB BAR */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badgePill: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#E8C547',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  badgePillText: {
    fontSize: 9.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#0B0B0B',
  },
});
