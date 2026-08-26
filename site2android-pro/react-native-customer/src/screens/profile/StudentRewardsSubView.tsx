import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

interface StudentRewardsSubViewProps {
  onBack: () => void;
}

export const StudentRewardsSubView: React.FC<StudentRewardsSubViewProps> = ({
  onBack,
}) => {
  const [studentEmail, setStudentEmail] = useState('');

  const isValidEmail = studentEmail.trim().endsWith('.edu') || studentEmail.trim().endsWith('.ac.in');

  return (
    <View style={styles.profileFigmaStudentScreenContainer}>
      {/* Custom Header */}
      <View style={styles.profileFigmaStudentHeader}>
        <TouchableOpacity onPress={onBack} style={styles.profileFigmaStudentHeaderBackBtn}>
          <ArrowLeft size={22} color="#eae1d4" />
        </TouchableOpacity>
        <Text style={styles.profileFigmaStudentHeaderTitle}>Student Rewards</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.profileFigmaStudentScrollView} contentContainerStyle={styles.profileFigmaStudentScrollContent}>
        {/* Main Illustration */}
        <View style={styles.profileFigmaStudentIllustrationContainer}>
          <Image
            source={require('../../assets/student_illustration.png')}
            style={styles.profileFigmaStudentIllustration}
            resizeMode="contain"
          />
        </View>

        {/* Main Title */}
        <Text style={styles.profileFigmaStudentMainTitle}>Student Rewards</Text>
        <Text style={styles.profileFigmaStudentSubtitle}>
          Verify your student email address to unlock exclusive My Quro rewards!
        </Text>

        {/* Benefits Section */}
        <Text style={styles.profileFigmaStudentSectionHeading}>BENEFITS</Text>
        <View style={styles.profileFigmaStudentCard}>
          {[
            'Free Deliveries at ₹9',
            'Flat 67% OFF on Food',
            'Additional ₹50 OFF on Rewards',
            'Flat 20% OFF on Dining & More!',
          ].map((benefit, idx) => (
            <View key={idx} style={styles.profileFigmaStudentBenefitRow}>
              <View style={styles.profileFigmaStudentBenefitDot} />
              <Text style={styles.profileFigmaStudentBenefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* How It Works Section */}
        <Text style={styles.profileFigmaStudentSectionHeading}>HOW IT WORKS</Text>
        <View style={styles.profileFigmaStudentCard}>
          {/* Step 1 */}
          <View style={styles.profileFigmaStepRow}>
            <View style={styles.profileFigmaStepLeftCol}>
              <View style={styles.profileFigmaStepCircle}>
                <Text style={styles.profileFigmaStepCircleText}>1</Text>
              </View>
              <View style={styles.profileFigmaStepLine} />
            </View>
            <View style={styles.profileFigmaStepRightCol}>
              <Text style={styles.profileFigmaStepText}>Enter your college email ID & click "Get OTP."</Text>
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.profileFigmaStepRow}>
            <View style={styles.profileFigmaStepLeftCol}>
              <View style={styles.profileFigmaStepCircle}>
                <Text style={styles.profileFigmaStepCircleText}>2</Text>
              </View>
              <View style={styles.profileFigmaStepLine} />
            </View>
            <View style={styles.profileFigmaStepRightCol}>
              <Text style={styles.profileFigmaStepText}>Check your email for the OTP.</Text>
            </View>
          </View>

          {/* Step 3 */}
          <View style={[styles.profileFigmaStepRow, { marginBottom: 0 }]}>
            <View style={styles.profileFigmaStepLeftCol}>
              <View style={styles.profileFigmaStepCircle}>
                <Text style={styles.profileFigmaStepCircleText}>3</Text>
              </View>
            </View>
            <View style={styles.profileFigmaStepRightCol}>
              <Text style={styles.profileFigmaStepText}>Enter OTP to verify & enjoy your rewards. 🎁</Text>
            </View>
          </View>
        </View>

        {/* Email input field */}
        <View style={styles.profileFigmaFormInputBox}>
          <TextInput
            value={studentEmail}
            onChangeText={setStudentEmail}
            placeholder="e.g. name@university.edu"
            placeholderTextColor="#9d9d9d"
            style={styles.profileFigmaFormInputField}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Gold Action Button */}
        <TouchableOpacity
          style={[styles.profileFigmaStudentSubmitBtn, isValidEmail && styles.profileFigmaStudentSubmitBtnActive]}
          activeOpacity={isValidEmail ? 0.7 : 1}
          onPress={() => {
            if (!isValidEmail) {
              Alert.alert('Invalid Email', 'Please enter a valid student email address ending in .edu or .ac.in');
              return;
            }
            Alert.alert(
              'Verification Sent',
              `A verification link has been sent to ${studentEmail}. Verify your student status to unlock rewards!`,
              [{ text: 'OK', onPress: onBack }]
            );
          }}
        >
          <Text style={[styles.profileFigmaStudentSubmitBtnText, isValidEmail && styles.profileFigmaStudentSubmitBtnTextActive]}>
            Verify Now
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  profileFigmaStudentScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  profileFigmaStudentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1817',
    paddingHorizontal: 24,
    paddingVertical: 13,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    justifyContent: 'space-between',
  },
  profileFigmaStudentHeaderBackBtn: {
    padding: 6,
  },
  profileFigmaStudentHeaderTitle: {
    fontSize: 18,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaStudentScrollView: {
    flex: 1,
  },
  profileFigmaStudentScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 60,
    alignItems: 'center',
  },
  profileFigmaStudentIllustrationContainer: {
    width: '100%',
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  profileFigmaStudentIllustration: {
    width: '100%',
    height: '100%',
  },
  profileFigmaStudentMainTitle: {
    fontSize: 36,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  profileFigmaStudentSubtitle: {
    fontSize: 15,
    color: '#868e96',
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  profileFigmaStudentSectionHeading: {
    fontSize: 12,
    color: '#868e96',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: 0.8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  profileFigmaStudentCard: {
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    marginBottom: 32,
  },
  profileFigmaStudentBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  profileFigmaStudentBenefitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f2ca50',
    marginRight: 16,
  },
  profileFigmaStudentBenefitText: {
    fontSize: 16,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaStudentSubmitBtn: {
    backgroundColor: '#2a2a2a',
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileFigmaStudentSubmitBtnActive: {
    backgroundColor: '#d4af37',
  },
  profileFigmaStudentSubmitBtnText: {
    fontSize: 18,
    color: '#868e96',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: -0.2,
  },
  profileFigmaStudentSubmitBtnTextActive: {
    color: '#554300',
  },
  profileFigmaStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  profileFigmaStepLeftCol: {
    alignItems: 'center',
    marginRight: 16,
  },
  profileFigmaStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#f2ca50',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  profileFigmaStepCircleText: {
    fontSize: 14,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaStepLine: {
    width: 2,
    height: 40,
    backgroundColor: '#4d4635',
    marginTop: 8,
  },
  profileFigmaStepRightCol: {
    flex: 1,
    paddingTop: 4,
  },
  profileFigmaStepText: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'Urbanist-Regular',
    lineHeight: 22,
  },
  profileFigmaFormInputBox: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#767676',
    borderRadius: 18,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    marginBottom: 16,
    width: '100%',
  },
  profileFigmaFormInputField: {
    flex: 1,
    fontSize: 16,
    color: '#eae1d4',
    paddingVertical: 10,
    fontFamily: 'Urbanist-Regular',
  },
});
