import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { User, Mail, Phone, ArrowLeft } from 'lucide-react-native';
import { scale } from './profileUtils';

interface EditProfileSubViewProps {
  isDarkMode: boolean;
  isLoading: boolean;
  editName: string;
  setEditName: (val: string) => void;
  editEmail: string;
  setEditEmail: (val: string) => void;
  editPhone: string;
  setEditPhone: (val: string) => void;
  handleSaveProfile: () => void;
  onBack: () => void;
}

export const EditProfileSubView: React.FC<EditProfileSubViewProps> = ({
  isDarkMode,
  isLoading,
  editName,
  setEditName,
  editEmail,
  setEditEmail,
  editPhone,
  setEditPhone,
  handleSaveProfile,
  onBack,
}) => {
  return (
    <View style={styles.favContainer}>
      {/* Header */}
      <View style={styles.favHeader}>
        <TouchableOpacity onPress={onBack} style={styles.favHeaderBackBtn}>
          <ArrowLeft size={22} color="#eae1d4" />
        </TouchableOpacity>
        <Text style={styles.favHeaderTitle}>edit profile</Text>
        <View style={{ width: 34 }} />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#f2ca50" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >

          {/* Floating Sparkle Decorative Row */}
          <View style={styles.sparkleRow}>
            <Svg width={24} height={24} viewBox="0 0 12.8333 12.8333" fill="none">
              <Path
                d="M10.5 4.66667L9.77083 3.0625L8.16667 2.33333L9.77083 1.60417L10.5 0L11.2292 1.60417L12.8333 2.33333L11.2292 3.0625L10.5 4.66667V4.66667M10.5 12.8333L9.77083 11.2292L8.16667 10.5L9.77083 9.77083L10.5 8.16667L11.2292 9.77083L12.8333 10.5L11.2292 11.2292L10.5 12.8333V12.8333M4.66667 11.0833L3.20833 7.875L0 6.41667L3.20833 4.95833L4.66667 1.75L6.125 4.95833L9.33333 6.41667L6.125 7.875L4.66667 11.0833V11.0833M4.66667 8.25417L5.25 7L6.50417 6.41667L5.25 5.83333L4.66667 4.57917L4.08333 5.83333L2.82917 6.41667L4.08333 7L4.66667 8.25417V8.25417M4.66667 6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667"
                fill="#D4AF37"
                fillOpacity={0.8}
              />
            </Svg>
            <Text style={styles.sparkleTagline}>Update your personal details</Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>FULL NAME</Text>
            <View style={styles.inputBox}>
              <User size={18} color="#f2ca50" style={styles.inputIcon} />
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter full name"
                placeholderTextColor="#9d9d9d"
                style={styles.inputField}
              />
            </View>

            <Text style={styles.formLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputBox}>
              <Mail size={18} color="#f2ca50" style={styles.inputIcon} />
              <TextInput
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Enter email address"
                placeholderTextColor="#9d9d9d"
                keyboardType="email-address"
                style={styles.inputField}
              />
            </View>

            <Text style={styles.formLabel}>MOBILE NUMBER</Text>
            <View style={styles.inputBox}>
              <Phone size={18} color="#f2ca50" style={styles.inputIcon} />
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#9d9d9d"
                keyboardType="phone-pad"
                style={styles.inputField}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>


        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  favContainer: {
    flex: 1,
    backgroundColor: '#191919',
  },
  favHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 13,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
  },
  favHeaderBackBtn: {
    padding: 6,
  },
  favHeaderTitle: {
    fontSize: 20,
    color: '#d0c5af',
    fontFamily: 'Urbanist-SemiBold',
    textAlign: 'center',
  },
  favLogoRow: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  favLogoMy: {
    fontSize: 50,
    color: '#deb853',
    fontFamily: 'Fasthand-Regular',
    letterSpacing: -1.5,
    height: 60,
    lineHeight: 70,
  },
  favQuroCropContainer: {
    width: 107,
    height: 60,
    overflow: 'hidden',
    marginLeft: 0,
  },
  favQuroCropImage: {
    width: 167,
    height: 90,
    marginLeft: -65,
    bottom: 20,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  sparkleTagline: {
    fontSize: 14 * scale,
    color: '#d0c5af',
    fontFamily: 'Urbanist-Medium',
  },
  formContainer: {
    paddingHorizontal: 22,
    marginTop: 10,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8a8a8a',
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputBox: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.35)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    fontFamily: 'Urbanist-Medium',
  },
  saveBtn: {
    backgroundColor: '#f2ca50',
    height: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
  },
  saveBtnText: {
    color: '#191919',
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  favPremiumFooter: {
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginTop: 30,
    marginBottom: 40,
  },
  favPremiumFooterSignature: {
    fontSize: 50,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: -0.22,
    lineHeight: 65,
    paddingTop: 10,
  },
  favPremiumFooterUp: {
    fontFamily: 'Fasthand-Regular',
    color: '#f2ca50',
  },
  favPremiumFooterSubtitle: {
    fontSize: 18,
    color: '#d0c5af',
    fontFamily: 'Urbanist-SemiBold',
    textAlign: 'left',
    lineHeight: 22,
    letterSpacing: 0.6,
    marginTop: 8,
  },
});
