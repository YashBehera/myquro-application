import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function DailyIncentiveLangScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const dateStr = (params.date as string) || 'Sunday, 16 August';

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/daily-incentive');
    }
  };

  const handleSelectLanguage = (lang: string) => {
    router.push({
      pathname: '/daily-incentive-form',
      params: { date: dateStr, language: lang },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily incentive issue</Text>
      </View>

      {/* SUBTITLE */}
      <Text style={styles.subtitleText}>Select the preferred language</Text>

      {/* MAIN CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardContainer}>
          {/* English Option */}
          <TouchableOpacity
            onPress={() => handleSelectLanguage('English')}
            style={styles.langRow}
            activeOpacity={0.7}
          >
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>EN</Text>
            </View>
            <View style={styles.textGroup}>
              <Text style={styles.langTitleText}>English</Text>
              <Text style={styles.langSubtext}>English</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#F2CA50" />
          </TouchableOpacity>

          <View style={styles.dottedDivider} />

          {/* Hinglish Option */}
          <TouchableOpacity
            onPress={() => handleSelectLanguage('Hinglish')}
            style={styles.langRow}
            activeOpacity={0.7}
          >
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>HI</Text>
            </View>
            <View style={styles.textGroup}>
              <Text style={styles.langTitleText}>Hinglish</Text>
              <Text style={styles.langSubtext}>English + हिंदी</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#F2CA50" />
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />

        {/* BOTTOM SKYLINE FOOTER */}
        <Image
          source={require('../../assets/images/skyline_footer.jpg')}
          style={styles.skylineImage}
          resizeMode="contain"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  subtitleText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 12,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  cardContainer: {
    backgroundColor: '#11100E',
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    borderRadius: 24,
    paddingVertical: 8,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 16,
  },
  badgeContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2520',
    backgroundColor: '#1C1A17',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  textGroup: {
    flex: 1,
    gap: 4,
  },
  langTitleText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  langSubtext: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#8D8D8D',
  },
  dottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#2A2520',
    borderStyle: 'dashed',
    marginHorizontal: 20,
  },
  spacer: {
    flex: 1,
  },
  skylineImage: {
    width: '100%',
    height: 120,
    marginTop: 40,
  },
});
