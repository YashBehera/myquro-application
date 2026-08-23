import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

export default function SOSScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleHelp = () => {
    router.push('/help-support');
  };

  const handleCallHelpline = () => {
    Alert.alert(
      'MyQuro Helpline',
      'Do you want to call MyQuro 24x7 emergency rider support?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => Linking.openURL('tel:18001239999').catch(() => {}),
        },
      ]
    );
  };

  const handleCallPolice = () => {
    Alert.alert(
      'Emergency - Police',
      'Connect with local police emergency dispatch (112)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call 112',
          style: 'destructive',
          onPress: () => Linking.openURL('tel:112').catch(() => {}),
        },
      ]
    );
  };

  const handleCallAmbulance = () => {
    Alert.alert(
      'Emergency - Ambulance',
      'Request medical emergency ambulance assistance (108)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call 108',
          style: 'destructive',
          onPress: () => Linking.openURL('tel:108').catch(() => {}),
        },
      ]
    );
  };

  const handleEmergencyDetails = () => {
    router.push('/emergency-contacts');
  };

  const handleInsuranceDetails = () => {
    router.push('/insurance');
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER: BACK + BRANDING + HELP */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.headerBtnTouch}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>

        <Text style={styles.brandTitleText}>
          My<Text style={styles.brandTitleWhite}>Quro</Text>
          <Text style={styles.brandDot}>.</Text>
        </Text>

        <TouchableOpacity
          onPress={handleHelp}
          style={styles.headerBtnTouch}
          activeOpacity={0.7}
        >
          <Ionicons name="help-circle-outline" size={26} color="#F2CA50" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CENTER HERO BEACON / SIREN GRAPHIC WITH HALO GLOW */}
        <View style={styles.heroBeaconWrapper}>
          {/* Background Dotted Matrix Patterns */}
          <View style={styles.dotsMatrixTopLeft}>
            <View style={styles.dotRow}>
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
            </View>
            <View style={styles.dotRow}>
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
            </View>
            <View style={styles.dotRow}>
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
            </View>
          </View>

          <View style={styles.dotsMatrixBottomRight}>
            <View style={styles.dotRow}>
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
            </View>
            <View style={styles.dotRow}>
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
            </View>
            <View style={styles.dotRow}>
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
            </View>
          </View>

          {/* Golden Sparkles */}
          <Ionicons name="sparkles" size={12} color="#F2CA50" style={styles.sparkleTopRight} />
          <Ionicons name="star" size={8} color="#F2CA50" style={styles.sparkleFarRight} />
          <Ionicons name="star" size={8} color="#F2CA50" style={styles.sparkleFarLeft} />

          {/* Concentric Halo Rings */}
          <View style={styles.haloOuterRing}>
            <View style={styles.haloMidRing}>
              <View style={styles.haloInnerCircle}>
                {/* Emergency Siren Beacon Graphic */}
                <View style={styles.sirenIconContainer}>
                  {/* Flashing light rays */}
                  <View style={styles.sirenRaysRow}>
                    <View style={[styles.sirenRay, { transform: [{ rotate: '-35deg' }] }]} />
                    <View style={[styles.sirenRay, { height: 7, marginTop: -2 }]} />
                    <View style={[styles.sirenRay, { transform: [{ rotate: '35deg' }] }]} />
                  </View>
                  {/* Siren Dome Dome */}
                  <View style={styles.sirenDome}>
                    <View style={styles.sirenDomeInner} />
                  </View>
                  {/* Siren Base */}
                  <View style={styles.sirenBase} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* HEADLINE SECTION */}
        <View style={styles.headlineBlock}>
          <Text style={styles.headlineTitle}>Are you in an emergency?</Text>
          <Text style={styles.headlineSubtitle}>Use these options only in emergency</Text>
        </View>

        {/* PRIMARY ACTION CARD: CALL MYQURO HELPLINE */}
        <TouchableOpacity
          onPress={handleCallHelpline}
          style={styles.primaryActionCard}
          activeOpacity={0.85}
        >
          <View style={styles.actionCardLeft}>
            <View style={styles.callIconBadge}>
              <Ionicons name="call" size={22} color="#F2CA50" />
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionCardTitle}>Call MyQuro helpline</Text>
              <Text style={styles.actionCardSubtitle}>Get immediate support</Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={22} color="#F2CA50" />
        </TouchableOpacity>

        {/* 2-GRID ROW: CALL POLICE & CALL AMBULANCE */}
        <View style={styles.gridRow}>
          {/* Grid Card 1: Call Police */}
          <TouchableOpacity
            onPress={handleCallPolice}
            style={styles.gridCard}
            activeOpacity={0.85}
          >
            <View style={styles.gridIconBadge}>
              {/* Police Officer / Shield Icon */}
              <Ionicons name="shield-half" size={26} color="#F2CA50" />
            </View>
            <Text style={styles.gridCardTitle}>Call{'\n'}Police</Text>
            <Text style={styles.gridCardSubtitle}>Connect with local police</Text>
          </TouchableOpacity>

          {/* Grid Card 2: Call Ambulance */}
          <TouchableOpacity
            onPress={handleCallAmbulance}
            style={styles.gridCard}
            activeOpacity={0.85}
          >
            <View style={styles.gridIconBadge}>
              {/* Medical Ambulance Icon */}
              <Ionicons name="medical" size={24} color="#F2CA50" />
            </View>
            <Text style={styles.gridCardTitle}>Call an{'\n'}ambulance</Text>
            <Text style={styles.gridCardSubtitle}>Request medical assistance</Text>
          </TouchableOpacity>
        </View>

        {/* BOTTOM LIST OPTIONS */}
        <View style={styles.bottomListCard}>
          {/* Row 1: Emergency Details */}
          <TouchableOpacity
            onPress={handleEmergencyDetails}
            style={styles.listOptionRow}
            activeOpacity={0.8}
          >
            <View style={styles.listOptionLeft}>
              <View style={styles.listIconCircle}>
                <Ionicons name="add" size={22} color="#F2CA50" />
              </View>
              <View style={styles.listTextCol}>
                <Text style={styles.listOptionTitle}>Emergency Details</Text>
                <Text style={styles.listOptionSubtitle}>
                  View and manage emergency information
                </Text>
              </View>
            </View>

            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
            </View>
          </TouchableOpacity>

          {/* Dashed Gold Divider */}
          <View style={styles.dashedDivider} />

          {/* Row 2: Insurance Details */}
          <TouchableOpacity
            onPress={handleInsuranceDetails}
            style={styles.listOptionRow}
            activeOpacity={0.8}
          >
            <View style={styles.listOptionLeft}>
              <View style={styles.listIconCircle}>
                <Ionicons name="shield-checkmark" size={20} color="#F2CA50" />
              </View>
              <View style={styles.listTextCol}>
                <Text style={styles.listOptionTitle}>Insurance Details</Text>
                <Text style={styles.listOptionSubtitle}>
                  View and manage your insurance
                </Text>
              </View>
            </View>

            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
            </View>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtnTouch: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitleText: {
    fontSize: 26,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#F2CA50',
    letterSpacing: -0.5,
  },
  brandTitleWhite: {
    color: '#FFFFFF',
  },
  brandDot: {
    color: '#F2CA50',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroBeaconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    marginTop: 8,
    position: 'relative',
  },
  dotsMatrixTopLeft: {
    position: 'absolute',
    left: 45,
    top: 35,
    gap: 6,
    opacity: 0.35,
  },
  dotsMatrixBottomRight: {
    position: 'absolute',
    right: 50,
    bottom: 35,
    gap: 6,
    opacity: 0.35,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tinyDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#F2CA50',
  },
  sparkleTopRight: {
    position: 'absolute',
    top: 30,
    right: 65,
    opacity: 0.8,
  },
  sparkleFarRight: {
    position: 'absolute',
    top: 95,
    right: 35,
    opacity: 0.7,
  },
  sparkleFarLeft: {
    position: 'absolute',
    top: 105,
    left: 40,
    opacity: 0.7,
  },
  haloOuterRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(242, 202, 80, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  haloMidRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(242, 202, 80, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(242, 202, 80, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  haloInnerCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#16130E',
    borderWidth: 2,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sirenIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sirenRaysRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sirenRay: {
    width: 2.5,
    height: 6,
    borderRadius: 1.5,
    backgroundColor: '#F2CA50',
  },
  sirenDome: {
    width: 26,
    height: 20,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    borderWidth: 2.5,
    borderColor: '#F2CA50',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sirenDomeInner: {
    width: 12,
    height: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: 'rgba(242, 202, 80, 0.25)',
  },
  sirenBase: {
    width: 32,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F2CA50',
    marginTop: 1,
  },
  headlineBlock: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  headlineTitle: {
    fontSize: 24,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  headlineSubtitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#9E9E9E',
    textAlign: 'center',
  },
  primaryActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#26221C',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  callIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#221D12',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  actionCardSubtitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#26221C',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#221D12',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridCardTitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  gridCardSubtitle: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  bottomListCard: {
    marginHorizontal: 16,
    paddingHorizontal: 4,
  },
  listOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  listOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  listIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#221D12',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listTextCol: {
    flex: 1,
  },
  listOptionTitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  listOptionSubtitle: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
    backgroundColor: '#141210',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashedDivider: {
    height: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.25)',
    borderStyle: 'dashed',
    marginVertical: 4,
  },
});
