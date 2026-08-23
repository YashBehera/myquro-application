import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SelectOutletTypeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSelectCategory = (categoryTitle: string, categoryLabel: string) => {
    // Navigate back to Restaurant Documents with selected category
    router.push({
      pathname: '/restaurant-documents',
      params: {
        outletType: `${categoryTitle}: ${categoryLabel}`,
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Navigation Bar */}
          <View style={styles.topNav}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={20} color="#E8C547" />
            </TouchableOpacity>
          </View>

          {/* Header Title */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>
              Select your <Text style={styles.headerTitleGold}>outlet type</Text>
            </Text>
            <Text style={styles.headerSubtitle}>
              Choose the outlet type that best describes your business.
            </Text>
          </View>

          {/* CARD 1: Category I */}
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.categoryCard}
            onPress={() =>
              handleSelectCategory('Category I', 'Freshly prepared food items only')
            }
          >
            <View style={styles.categoryTopRow}>
              <Text style={styles.categoryTitle}>Category I</Text>
              <View style={styles.selectButtonRow}>
                <Text style={styles.selectText}>Select</Text>
                <Ionicons name="chevron-forward" size={16} color="#E8C547" />
              </View>
            </View>

            <Text style={styles.categoryDescription}>
              Sells freshly prepared food items only.{'\n'}Does not sell any packed item.
            </Text>

            <View style={styles.dashedDivider} />

            <Text style={styles.categoryFooterNote}>
              <Text style={styles.footerHighlight}>MyQuro</Text> will pay the GST on your behalf
            </Text>
          </TouchableOpacity>

          {/* CARD 2: Category II */}
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.categoryCard}
            onPress={() =>
              handleSelectCategory('Category II', 'IceCreams, bakery & packed items')
            }
          >
            <View style={styles.categoryTopRow}>
              <Text style={styles.categoryTitle}>Category II</Text>
              <View style={styles.selectButtonRow}>
                <Text style={styles.selectText}>Select</Text>
                <Ionicons name="chevron-forward" size={16} color="#E8C547" />
              </View>
            </View>

            <Text style={styles.categoryDescription}>
              Sells IceCreams, bakery products, sweets{'\n'}or other packed items only.
            </Text>

            <View style={styles.dashedDivider} />

            <Text style={styles.categoryFooterNote}>
              The <Text style={styles.footerHighlight}>outlet itself</Text> will pay GST on these orders.
            </Text>
          </TouchableOpacity>

          {/* CARD 3: Category III */}
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.categoryCard}
            onPress={() =>
              handleSelectCategory('Category III', 'Freshly prepared & packed items')
            }
          >
            <View style={styles.categoryTopRow}>
              <Text style={styles.categoryTitle}>Category III</Text>
              <View style={styles.selectButtonRow}>
                <Text style={styles.selectText}>Select</Text>
                <Ionicons name="chevron-forward" size={16} color="#E8C547" />
              </View>
            </View>

            <Text style={styles.categoryDescription}>
              Sells both freshly prepared and{'\n'}packed food items.
            </Text>

            <View style={styles.dashedDivider} />

            <Text style={styles.categoryFooterNote}>
              <Text style={styles.footerHighlight}>MyQuro</Text> will pay GST only on sales of{'\n'}freshly prepared food items.
            </Text>
          </TouchableOpacity>

          {/* Bottom Help Card */}
          <View style={styles.helpCard}>
            <Ionicons name="headset-outline" size={24} color="#E8C547" />
            <View style={styles.helpVerticalDivider} />
            <Text style={styles.helpText}>
              If you need any help, check out the{' '}
              <Text style={styles.faqsLink}>FAQs</Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  /* Top Nav */
  topNav: {
    paddingTop: 12,
    marginBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#191919',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Header Section */
  headerRow: {
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  headerTitleGold: {
    color: '#E8C547',
  },
  headerSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    color: '#8E8E8E',
    lineHeight: 18,
  },

  /* Category Cards */
  categoryCard: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 14,
  },
  categoryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 17,
    color: '#FFFFFF',
  },
  selectButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 197, 71, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8C547',
  },
  selectText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#E8C547',
    marginRight: 2,
  },
  categoryDescription: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#8E8E8E',
    lineHeight: 18,
  },
  dashedDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 12,
  },
  categoryFooterNote: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
    lineHeight: 16,
  },
  footerHighlight: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
  },

  /* Bottom Help Card */
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
  },
  helpVerticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 12,
  },
  helpText: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#8E8E8E',
  },
  faqsLink: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
  },
});
