import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, CreditCard, Trash2, CheckCircle, ChevronLeft } from 'lucide-react-native';
import { COLORS } from '../../theme/Theme';

interface PaymentsSubViewProps {
  isDarkMode: boolean;
  paymentsList: any[];
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const PaymentsSubView: React.FC<PaymentsSubViewProps> = ({
  isDarkMode,
  paymentsList,
  onBack,
  showToast,
}) => {
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [savedPaymentCards, setSavedPaymentCards] = useState<any[]>([]);

  useEffect(() => {
    const loadCards = async () => {
      try {
        const savedCardsStr = await AsyncStorage.getItem('@saved_payment_cards');
        if (savedCardsStr) {
          setSavedPaymentCards(JSON.parse(savedCardsStr));
        } else {
          const defaultCards = [
            { id: 'card_1', name: 'HDFC Credit Card', number: 'Visa ending in 4321', exp: '08/29' }
          ];
          setSavedPaymentCards(defaultCards);
          await AsyncStorage.setItem('@saved_payment_cards', JSON.stringify(defaultCards));
        }
      } catch (err) {
        console.warn('Error loading saved cards:', err);
      }
    };
    loadCards();
  }, []);

  const handleSaveCard = async () => {
    if (!cardName.trim() || !cardNumber.trim() || !cardExp.trim()) {
      Alert.alert('Error', 'Please fill in all card fields');
      return;
    }
    const newCard = {
      id: 'card_' + Date.now(),
      name: cardName,
      number: cardNumber,
      exp: cardExp,
    };
    const updated = [...savedPaymentCards, newCard];
    setSavedPaymentCards(updated);
    await AsyncStorage.setItem('@saved_payment_cards', JSON.stringify(updated));
    setCardName('');
    setCardNumber('');
    setCardExp('');
    setShowCardForm(false);
    Alert.alert('Success', 'Card saved successfully!');
  };

  const handleDeleteCard = async (id: string) => {
    Alert.alert('Delete Card', 'Are you sure you want to delete this card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = savedPaymentCards.filter(c => c.id !== id);
          setSavedPaymentCards(updated);
          await AsyncStorage.setItem('@saved_payment_cards', JSON.stringify(updated));
          Alert.alert('Success', 'Card deleted successfully!');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (showCardForm) {
              setShowCardForm(false);
            } else {
              onBack();
            }
          }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PAYMENTS & REFUNDS</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionHeading, { marginLeft: 16, marginTop: 20 }]}>SAVED PAYMENT MODES</Text>

        {!showCardForm ? (
          <View>
            <TouchableOpacity
              style={[styles.addAddressTrigger, isDarkMode && styles.addAddressTriggerDark]}
              onPress={() => setShowCardForm(true)}
            >
              <Plus size={20} color={COLORS.quroRedPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.addAddressTriggerText}>Add New Card</Text>
            </TouchableOpacity>

            <View style={[styles.listSection, isDarkMode && styles.listSectionDark]}>
              {savedPaymentCards.length === 0 ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No saved cards found</Text>
                </View>
              ) : (
                savedPaymentCards.map((card, idx) => (
                  <View key={card.id}>
                    <View style={[styles.paymentRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <CreditCard size={20} color={isDarkMode ? '#FFFFFB' : '#1A1A1A'} style={{ marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.paymentModeTitle, isDarkMode && styles.textWhite]}>{card.name}</Text>
                          <Text style={styles.paymentModeSub}>{card.number} • Exp {card.exp}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteCard(card.id)} style={{ padding: 6 }}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                    {idx < savedPaymentCards.length - 1 && <View style={[styles.rowDivider, isDarkMode && styles.itemDividerDark]} />}
                  </View>
                ))
              )}
            </View>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={[styles.formTitle, isDarkMode && styles.textWhite]}>Add New Card</Text>

            <Text style={[styles.formLabel, isDarkMode && styles.textWhite]}>Card Name (e.g. My HDFC Card)</Text>
            <View style={[styles.inputBox, isDarkMode && styles.inputBoxDark]}>
              <TextInput
                value={cardName}
                onChangeText={setCardName}
                placeholder="e.g. HDFC Credit Card"
                placeholderTextColor="#A0A0A0"
                style={[styles.inputField, isDarkMode && styles.textWhite]}
              />
            </View>

            <Text style={[styles.formLabel, isDarkMode && styles.textWhite]}>Card Number</Text>
            <View style={[styles.inputBox, isDarkMode && styles.inputBoxDark]}>
              <TextInput
                value={cardNumber}
                onChangeText={setCardNumber}
                placeholder="e.g. Visa ending in 4321"
                placeholderTextColor="#A0A0A0"
                style={[styles.inputField, isDarkMode && styles.textWhite]}
              />
            </View>

            <Text style={[styles.formLabel, isDarkMode && styles.textWhite]}>Expiry Date</Text>
            <View style={[styles.inputBox, isDarkMode && styles.inputBoxDark]}>
              <TextInput
                value={cardExp}
                onChangeText={setCardExp}
                placeholder="e.g. 08/29"
                placeholderTextColor="#A0A0A0"
                style={[styles.inputField, isDarkMode && styles.textWhite]}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, marginTop: 0, backgroundColor: '#6B7280' }]} onPress={() => setShowCardForm(false)}>
                <Text style={styles.saveBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, marginTop: 0 }]} onPress={handleSaveCard}>
                <Text style={styles.saveBtnText}>Save Card</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={[styles.sectionHeading, { marginLeft: 16, marginTop: 24 }]}>PAYMENT TRANSACTIONS</Text>
        {paymentsList.filter(p => !p.isRefund).length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No payment transactions found</Text>
          </View>
        ) : (
          paymentsList.filter(p => !p.isRefund).map(p => (
            <View key={p.id} style={[styles.refundCard, isDarkMode && styles.refundCardDark]}>
              <View style={styles.refundHeader}>
                <Text style={[styles.refundOrder, isDarkMode && styles.textWhite]}>{p.restaurantName || 'Order'}</Text>
                <Text style={[styles.refundAmt, isDarkMode && styles.textWhite]}>₹{(p.amount / 100).toFixed(2)}</Text>
              </View>
              <Text style={styles.refundDesc}>Paid via {p.method?.toUpperCase() || 'UPI'} • Ref: {p.referenceNumber || 'N/A'}</Text>
              <View style={styles.refundStatusRow}>
                <CheckCircle size={16} color={p.status === 'completed' || p.status === 'success' ? '#10B981' : '#EF4444'} style={{ marginRight: 6 }} />
                <Text style={[styles.refundStatusText, { color: p.status === 'completed' || p.status === 'success' ? '#10B981' : '#EF4444' }]}>
                  {p.status?.toUpperCase() || 'SUCCESSFUL'} • {new Date(p.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionHeading, { marginLeft: 16, marginTop: 24 }]}>REFUND HISTORY</Text>
        {paymentsList.filter(p => p.isRefund).length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No refund history found</Text>
          </View>
        ) : (
          paymentsList.filter(p => p.isRefund).map(p => (
            <View key={p.id} style={[styles.refundCard, isDarkMode && styles.refundCardDark]}>
              <View style={styles.refundHeader}>
                <Text style={[styles.refundOrder, isDarkMode && styles.textWhite]}>{p.restaurantName || 'Refund'}</Text>
                <Text style={[styles.refundAmt, isDarkMode && styles.textWhite]}>₹{(p.amount / 100).toFixed(2)}</Text>
              </View>
              <Text style={styles.refundDesc}>Refunded to source account ({p.method?.toUpperCase() || 'UPI'})</Text>
              <View style={styles.refundStatusRow}>
                <CheckCircle size={16} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.refundStatusText}>
                  {p.status?.toUpperCase() || 'SUCCESSFUL'} • {new Date(p.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#0F0F12',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#686B78',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  addAddressTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  addAddressTriggerDark: {
    backgroundColor: '#1E1E24',
    borderBottomColor: '#2C2C2E',
  },
  addAddressTriggerText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.quroRedPrimary,
  },
  listSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  listSectionDark: {
    backgroundColor: '#1E1E24',
    borderBottomColor: '#2C2C2E',
  },
  paymentRow: {
    flexDirection: 'row',
    padding: 16,
  },
  paymentModeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  paymentModeSub: {
    fontSize: 12,
    color: '#686B78',
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#EBEBEB',
    marginLeft: 48,
  },
  itemDividerDark: {
    backgroundColor: '#2C2C2E',
  },
  formContainer: {
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#686B78',
    marginTop: 16,
    marginBottom: 6,
  },
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
  },
  inputBoxDark: {
    backgroundColor: '#1E1E24',
    borderColor: '#2C2C2E',
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  saveBtn: {
    backgroundColor: '#fc8019',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  refundCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EBEBEB',
  },
  refundCardDark: {
    backgroundColor: '#1E1E24',
    borderColor: '#2C2C2E',
  },
  refundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  refundOrder: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  refundAmt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  refundDesc: {
    fontSize: 12,
    color: '#686B78',
    marginBottom: 8,
  },
  refundStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refundStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
