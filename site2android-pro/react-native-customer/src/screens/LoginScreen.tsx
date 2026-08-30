import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Defs,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { useViewModel } from "../state/MainViewModel";
import {
  SCALE,
  moderateScale,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  MAX_CONTENT_WIDTH,
} from "../utils/responsive";

const scale = SCALE;

export const LoginScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { login, sendOtp, verifyOtp, setAuthenticatedState } = useViewModel();
  const [authMode, setAuthMode] = useState<"phone" | "otp" | "verified">(
    "phone",
  );
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verifiedState, setVerifiedState] = useState<any>(null);
  const [cooldown, setCooldown] = useState(0);

  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (isLoading) return;
    if (phone.length < 10) {
      Alert.alert("Invalid Phone Number", "Please enter a valid 10-digit mobile number");
      return;
    }
    setIsLoading(true);
    setOtpError(null);
    try {
      const fullPhone = phone.startsWith('+91') ? phone : '+91' + phone;
      await sendOtp(fullPhone);
      setAuthMode("otp");
      setCooldown(30);
    } catch (error: any) {
      Alert.alert(
        "Could Not Send OTP",
        error.message || "Unable to send verification code. Please check your network connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isLoading) return;
    setIsLoading(true);
    setOtpError(null);
    try {
      const fullPhone = phone.startsWith('+91') ? phone : '+91' + phone;
      await sendOtp(fullPhone);
      setCooldown(30);
      Alert.alert("OTP Resent", `A new 6-digit code has been sent to +91 ${phone}`);
    } catch (error: any) {
      setOtpError(error.message || "Failed to resend OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (otpCode: string) => {
    if (isLoading) return;
    if (otpCode.length < 6) {
      setOtpError("Please enter a 6-digit OTP");
      return;
    }
    setIsLoading(true);
    setOtpError(null);
    try {
      const fullPhone = phone.startsWith('+91') ? phone : '+91' + phone;
      const authStateResult = await verifyOtp(fullPhone, otpCode);
      setVerifiedState(authStateResult);
      await setAuthenticatedState(authStateResult);
      setIsLoading(false);
      setAuthMode("verified");
    } catch (error: any) {
      setIsLoading(false);
      setOtpError(error.message || "Invalid OTP. Please try again.");
    }
  };

  const handleGetStarted = async () => {
    if (verifiedState) {
      try {
        await setAuthenticatedState(verifiedState);
      } catch (err) {
        console.error("Failed to commit authenticated state:", err);
      }
    }
    onBack();
  };

  // SVG Icons
  const BackArrowIcon = () => (
    <Svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#deb853"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );

  const SecurityShieldIcon = () => (
    <Svg width="11" height="14" viewBox="0 0 10.6667 13.3333" fill="none">
      <Path
        d="M4.63333 9.03333L8.4 5.26667L7.45 4.31667L4.63333 7.13333L3.23333 5.73333L2.28333 6.68333L4.63333 9.03333V9.03333M5.33333 13.3333C3.78889 12.9444 2.51389 12.0583 1.50833 10.675C0.502778 9.29167 0 7.75556 0 6.06667V2L5.33333 0L10.6667 2V6.06667C10.6667 7.75556 10.1639 9.29167 9.15833 10.675C8.15278 12.0583 6.87778 12.9444 5.33333 13.3333V13.3333M5.33333 11.9333C6.48889 11.5667 7.44444 10.8333 8.2 9.73333C8.95556 8.63333 9.33333 7.41111 9.33333 6.06667V2.91667L5.33333 1.41667L1.33333 2.91667V6.06667C1.33333 7.41111 1.71111 8.63333 2.46667 9.73333C3.22222 10.8333 4.17778 11.5667 5.33333 11.9333V11.9333M5.33333 6.66667V6.66667V6.66667V6.66667V6.66667V6.66667V6.66667V6.66667V6.66667V6.66667"
        fill="#d0c5af"
      />
    </Svg>
  );

  const DownChevronIcon = () => (
    <Svg width="7" height="5" viewBox="0 0 7 5" fill="none">
      <Path
        d="M1 1L3.5 3.5L6 1"
        stroke="#e2e2e2"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </Svg>
  );

  const MailIcon = () => (
    <Svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d0c5af"
      strokeWidth="1.8"
    >
      <Rect x="3" y="5" width="18" height="14" rx="2" />
      <Path d="M3 7l9 6 9-6" />
    </Svg>
  );

  const LockIcon = () => (
    <Svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d0c5af"
      strokeWidth="1.8"
    >
      <Rect x="5" y="11" width="14" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );

  const EyeIcon = () => (
    <Svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d0c5af"
      strokeWidth="1.8"
    >
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  );

  const EyeOffIcon = () => (
    <Svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d0c5af"
      strokeWidth="1.8"
    >
      <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <Line x1="1" y1="1" x2="23" y2="23" />
    </Svg>
  );

  const InputPersonIcon = () => (
    <Svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d0c5af"
      strokeWidth="1.8"
    >
      <Circle cx="12" cy="8" r="3.5" />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </Svg>
  );

  const GoogleIcon = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );

  return (
    <View style={styles.safeArea}>
      {/* Golden ambient background glows */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFillObject} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
          <Defs>
            <RadialGradient
              id="glowTopLeft"
              cx={0}
              cy={0}
              r={220 * scale}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="#d4af37" stopOpacity={0.35} />
              <Stop offset="55%" stopColor="#d4af37" stopOpacity={0.12} />
              <Stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient
              id="glowBottomRight"
              cx={SCREEN_WIDTH - 20}
              cy={SCREEN_WIDTH * 1.1}
              r={200 * scale}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="#d4af37" stopOpacity={0.25} />
              <Stop offset="55%" stopColor="#d4af37" stopOpacity={0.08} />
              <Stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={0} cy={0} r={220 * scale} fill="url(#glowTopLeft)" />
          {/* <Circle cx={SCREEN_WIDTH - 20} cy={SCREEN_WIDTH * 1.1} r={200 * scale} fill="url(#glowBottomRight)" /> */}
        </Svg>
      </View>

      {/* Absolute Back Button outside ScrollView for direct touch response */}
      {authMode === "otp" && (
        <TouchableOpacity style={styles.backArrowAbsolute} onPress={onBack}>
          <BackArrowIcon />
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.root}
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header section with logo positioned absolutely */}
        <View
          style={
            authMode === "otp"
              ? styles.logoAbsoluteRight
              : styles.logoAbsoluteLeft
          }
        >
          <Text style={styles.logoMy}>My</Text>
          <View style={styles.logoQuroClip}>
            <Image
              source={require("../assets/images/quro-logo-text.png")}
              style={styles.logoQuroImg}
            />
          </View>
        </View>

        {authMode === "verified" ? (
          <View style={styles.successContainer}>
            {/* Glass Badge */}
            <View style={styles.glassBadge}>
              <View style={styles.glowingIconOuter}>
                <View style={styles.glowingIcon}>
                  <Svg
                    width={24.45 * scale}
                    height={18.04 * scale}
                    viewBox="0 0 24.45 18.0375"
                    fill="none"
                  >
                    <Path
                      d="M8.55 18.0375L0 9.4875L2.1375 7.35L8.55 13.7625L22.3125 0L24.45 2.1375L8.55 18.0375V18.0375"
                      fill="#3C2F00"
                    />
                  </Svg>
                </View>
              </View>
              <Text style={styles.successLabel}>SUCCESS</Text>
            </View>

            {/* Typography Section */}
            <View style={styles.successTypography}>
              <Text style={styles.successTitle}>Phone Verified</Text>
              <Text style={styles.successSubtitle}>
                Your number has been successfully{"\n"}verified. You're ready to
                explore My Quro.
              </Text>
            </View>

            {/* Call to Action Buttons */}
            <View style={styles.successButtons}>
              <TouchableOpacity
                style={styles.getStartedBtn}
                onPress={handleGetStarted}
              >
                <Text style={styles.getStartedText}>GET STARTED</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.needHelpBtn}
                onPress={() =>
                  Alert.alert("Help", "Contacting customer support...")
                }
              >
                <Text style={styles.needHelpText}>NEED HELP?</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Verification Phone Illustration */}
            <View style={styles.illustrationWrap}>
              <Image
                source={require("../assets/images/phone-verify-illustration.png")}
                style={styles.illustrationImg}
                resizeMode="contain"
              />
            </View>

            <View style={styles.textContent}>
              <Text style={styles.headingText}>
                {authMode === "phone" && "Welcome to My Quro"}
                {authMode === "otp" && "Verify Details"}
              </Text>
              <Text style={styles.subtitleText}>
                {authMode === "phone" &&
                  "Enter your mobile number to continue."}
                {authMode === "otp" &&
                  `Enter the 6-digit code sent to +91 ${phone}`}
              </Text>
            </View>

            {/* Glassmorphic Form Card Area */}
            <View style={styles.formCard}>
              {authMode === "phone" && (
                <>
                  {/* Mobile Number Container */}
                  <View style={styles.inputCard}>
                    <View style={styles.countrySelectorMock}>
                      {/* CSS Indian Flag */}
                      <View style={styles.flagContainer}>
                        <View style={styles.flagStripeOrange} />
                        <View style={styles.flagStripeWhite}>
                          <View style={styles.flagAshokaWheel} />
                        </View>
                        <View style={styles.flagStripeGreen} />
                      </View>
                      <Text style={styles.countryCodeText}>+91</Text>
                      {/* <View style={styles.downChevronWrap}>
                        <DownChevronIcon />
                      </View> */}
                      <View style={styles.countrySelectorDivider} />
                    </View>
                    <TextInput
                      style={styles.inputEl}
                      keyboardType="phone-pad"
                      placeholder="98765 43210"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={phone}
                      onChangeText={(val) =>
                        setPhone(val.replace(/[^0-9]/g, ""))
                      }
                      maxLength={10}
                      autoFocus
                    />
                  </View>

                  {/* Action Continue Button */}
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      phone.length === 10
                        ? styles.actionBtnActive
                        : styles.actionBtnDisabled,
                    ]}
                    onPress={handleSendOtp}
                    disabled={phone.length < 10 || isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#3c2f00" />
                    ) : (
                      <Text style={styles.actionBtnText}>Continue</Text>
                    )}
                  </TouchableOpacity>

                  {/* Footer Disclaimer */}
                  <View style={styles.disclaimerRow}>
                    <SecurityShieldIcon />
                    <Text style={styles.disclaimerText}>
                      WE'LL SEND A SECURE OTP TO VERIFY YOUR NUMBER.
                    </Text>
                  </View>
                </>
              )}

              {authMode === "otp" && (
                <>
                  {/* OTP individual digit boxes */}
                  <View style={styles.otpWrapper}>
                    <TextInput
                      ref={otpInputRef}
                      style={styles.hiddenInput}
                      value={otp}
                      onChangeText={(val) => {
                        const cleanVal = val.replace(/[^0-9]/g, "");
                        setOtp(cleanVal);
                        if (cleanVal.length === 6) {
                          Keyboard.dismiss();
                          handleVerifyOtp(cleanVal);
                        }
                      }}
                      maxLength={6}
                      keyboardType="number-pad"
                      autoFocus
                    />

                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.otpBox,
                          otp.length === index && styles.otpBoxActive,
                          otp.length > index && styles.otpBoxFilled,
                        ]}
                        onPress={() => otpInputRef.current?.focus()}
                        activeOpacity={1}
                      >
                        <Text style={styles.otpText}>{otp[index] || ""}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {otpError && <Text style={styles.errorText}>{otpError}</Text>}

                  <View style={styles.otpActionsRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setAuthMode("phone");
                        setOtp("");
                        setOtpError(null);
                      }}
                      style={styles.changePhoneBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Change phone number"
                    >
                      <Text style={styles.changePhoneText}>
                        Change phone number
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleResendOtp}
                      disabled={cooldown > 0 || isLoading}
                      style={styles.resendOtpBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Resend OTP code"
                    >
                      <Text
                        style={[
                          styles.resendOtpText,
                          cooldown > 0 && styles.resendOtpTextDisabled,
                        ]}
                      >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Action Verify Button */}
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      otp.length === 6
                        ? styles.actionBtnActive
                        : styles.actionBtnDisabled,
                    ]}
                    onPress={() => handleVerifyOtp(otp)}
                    disabled={otp.length !== 6 || isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#3c2f00" />
                    ) : (
                      <Text style={styles.actionBtnText}>Verify OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        {/* Bottom copyright notice rights reserved */}
        <View style={styles.rightsContainer}>
          <Text style={styles.rightsText}>Rights reserved by</Text>
          <View style={styles.rightsLogoRow}>
            <Text style={styles.rightsMy}>My</Text>
            <View style={styles.rightsQuroClip}>
              <Image
                source={require("../assets/images/quro-logo-text.png")}
                style={styles.rightsQuroImg}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#191919",
  },
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: isTablet ? 540 : undefined,
    alignSelf: "center",
  },
  backArrowAbsolute: {
    position: "absolute",
    left: 24 * scale,
    top: 60 * scale,
    padding: 8 * scale,
    zIndex: 10,
  },
  logoAbsoluteRight: {
    position: "absolute",
    right: 40 * scale,
    top: 60 * scale,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  logoAbsoluteLeft: {
    position: "absolute",
    left: 57 * scale,
    top: 60 * scale,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  logoMy: {
    fontFamily: "Fasthand-Regular",
    fontSize: 30 * scale,
    color: "#deb853",
    letterSpacing: -0.9 * scale,
    marginRight: 2 * scale,
  },
  logoQuroClip: {
    width: 68 * scale,
    height: 31 * scale,
    overflow: "hidden",
  },
  logoQuroImg: {
    position: "absolute",
    width: 122 * scale,
    height: 56 * scale,
    left: -49 * scale,
    top: -13 * scale,
  },
  illustrationWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 65 * scale,
    marginBottom: 16 * scale,
  },
  illustrationImg: {
    width: 373 * scale,
    height: 373 * scale,
  },
  textContent: {
    alignItems: "center",
    paddingHorizontal: 30 * scale,
    marginBottom: 24 * scale,
  },
  headingText: {
    fontFamily: "Urbanist-SemiBold",
    fontSize: 24 * scale,
    color: "#e2e2e2",
    textAlign: "center",
    letterSpacing: -0.5 * scale,
    marginBottom: 8 * scale,
  },
  subtitleText: {
    fontFamily: "Urbanist-Regular",
    fontSize: 16 * scale,
    color: "#d0c5af",
    opacity: 0.8,
    textAlign: "center",
  },
  formCard: {
    paddingHorizontal: 45 * scale,
    width: "100%",
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(212, 175, 55, 0.2)",
    borderWidth: 1,
    borderRadius: 12 * scale,
    height: 60 * scale,
    paddingHorizontal: 12 * scale,
    marginBottom: 24 * scale,
  },
  countrySelectorMock: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10 * scale,
  },
  flagContainer: {
    width: 22 * scale,
    height: 14 * scale,
    borderWidth: 0.5,
    borderColor: "rgba(153, 144, 124, 0.3)",
    borderRadius: 1 * scale,
    overflow: "hidden",
    marginRight: 8 * scale,
  },
  flagStripeOrange: {
    flex: 1,
    backgroundColor: "#f93",
  },
  flagStripeWhite: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  flagAshokaWheel: {
    width: 3 * scale,
    height: 3 * scale,
    borderRadius: 1.5 * scale,
    backgroundColor: "#000080",
  },
  flagStripeGreen: {
    flex: 1,
    backgroundColor: "#138808",
  },
  countryCodeText: {
    fontFamily: "Urbanist-Regular",
    fontSize: 14 * scale,
    color: "#e2e2e2",
    marginRight: 8 * scale,
  },
  downChevronWrap: {
    marginRight: 12 * scale,
  },
  countrySelectorDivider: {
    width: 1,
    height: 20 * scale,
    backgroundColor: "rgba(153, 144, 124, 0.2)",
  },
  inputEl: {
    flex: 1,
    fontSize: 18 * scale,
    fontFamily: "Urbanist-Regular",
    color: "#e2e2e2",
    paddingVertical: 0,
  },
  actionBtn: {
    borderRadius: 12 * scale,
    height: 61 * scale,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20 * scale,
  },
  actionBtnActive: {
    backgroundColor: "#f2ca50",
  },
  actionBtnDisabled: {
    backgroundColor: "rgba(242, 202, 80, 0.4)",
  },
  actionBtnText: {
    fontFamily: "Urbanist-ExtraBold",
    fontSize: 18 * scale,
    color: "#3c2f00",
    fontWeight: "bold",
    letterSpacing: 0.18 * scale,
  },
  disclaimerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.6,
    marginBottom: 20 * scale,
  },
  disclaimerText: {
    fontFamily: "JetBrains_Mono-Medium",
    fontSize: 10 * scale,
    color: "#d0c5af",
    letterSpacing: 0.6 * scale,
    marginLeft: 8 * scale,
  },
  emailToggleBtn: {
    alignItems: "center",
    paddingVertical: 10 * scale,
    marginBottom: 16 * scale,
  },
  emailToggleText: {
    fontFamily: "Urbanist-SemiBold",
    fontSize: 14 * scale,
    color: "#f2ca50",
  },
  otpWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20 * scale,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpBox: {
    width: 44 * scale,
    height: 52 * scale,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    borderRadius: 8 * scale,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  otpBoxActive: {
    borderColor: "#f2ca50",
    borderWidth: 1.5,
  },
  otpBoxFilled: {
    borderColor: "rgba(212, 175, 55, 0.6)",
  },
  otpText: {
    fontSize: 20 * scale,
    fontFamily: "Urbanist-Bold",
    color: "#e2e2e2",
  },
  otpActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20 * scale,
  },
  changePhoneBtn: {
    paddingVertical: 6 * scale,
  },
  changePhoneText: {
    fontFamily: "Urbanist-SemiBold",
    fontSize: 13.5 * scale,
    color: "#f2ca50",
  },
  resendOtpBtn: {
    paddingVertical: 6 * scale,
  },
  resendOtpText: {
    fontFamily: "Urbanist-Bold",
    fontSize: 13.5 * scale,
    color: "#deb853",
  },
  resendOtpTextDisabled: {
    color: "rgba(255, 255, 255, 0.4)",
    fontFamily: "Urbanist-Medium",
  },
  errorText: {
    color: "#ef4444",
    fontFamily: "Urbanist-Regular",
    fontSize: 13 * scale,
    textAlign: "center",
    marginBottom: 12 * scale,
  },
  emailInputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(212, 175, 55, 0.2)",
    borderWidth: 1,
    borderRadius: 10 * scale,
    height: 50 * scale,
    paddingHorizontal: 12 * scale,
    marginBottom: 16 * scale,
  },
  inputIconWrap: {
    marginRight: 10 * scale,
  },
  eyeBtn: {
    padding: 8 * scale,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20 * scale,
  },
  checkbox: {
    width: 18 * scale,
    height: 18 * scale,
    borderRadius: 3 * scale,
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.4)",
    marginRight: 8 * scale,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: "#f2ca50",
    borderColor: "#f2ca50",
  },
  checkLabel: {
    fontSize: 12.5 * scale,
    fontFamily: "Urbanist-Regular",
    color: "#d0c5af",
    flex: 1,
  },
  goldLink: {
    color: "#f2ca50",
    fontFamily: "Urbanist-SemiBold",
  },
  alreadyRow: {
    textAlign: "center",
    fontFamily: "Urbanist-Regular",
    fontSize: 13.5 * scale,
    color: "#d0c5af",
    marginBottom: 16 * scale,
  },
  signInLink: {
    color: "#f2ca50",
    fontFamily: "Urbanist-Bold",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16 * scale,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  orText: {
    fontSize: 13 * scale,
    fontFamily: "Urbanist-Regular",
    color: "#d0c5af",
    opacity: 0.6,
    marginHorizontal: 10 * scale,
  },
  googleBtn: {
    width: "100%",
    height: 52 * scale,
    borderRadius: 28 * scale,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30 * scale,
  },
  googleBtnText: {
    fontSize: 15 * scale,
    fontFamily: "Urbanist-SemiBold",
    color: "#e2e2e2",
    marginLeft: 10 * scale,
  },
  rightsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignContent: "center",
    gap: 8,
    alignItems: "center",
    marginTop: 20 * scale,
    marginBottom: 16 * scale,
    opacity: 0.6,
  },
  rightsText: {
    fontFamily: "BebasNeue-Regular",
    fontSize: 16 * scale,
    color: "#c0c0c0",
    letterSpacing: 1.8 * scale,
    marginBottom: 4 * scale,
  },
  rightsLogoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightsMy: {
    fontFamily: "Fasthand-Regular",
    fontSize: 16 * scale,
    color: "#deb853",
    letterSpacing: -0.5 * scale,
    marginRight: 1 * scale,
  },
  rightsQuroClip: {
    width: 36 * scale,
    height: 16 * scale,
    overflow: "hidden",
  },
  rightsQuroImg: {
    position: "absolute",
    width: 65 * scale,
    height: 29 * scale,
    left: -25 * scale,
    top: -7 * scale,
  },
  successContainer: {
    alignItems: "center",
    paddingTop: 220 * scale,
    paddingHorizontal: 20 * scale,
  },
  glassBadge: {
    width: 192 * scale,
    height: 192 * scale,
    borderRadius: 96 * scale,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 44 * scale,
  },
  glowingIconOuter: {
    paddingBottom: 8 * scale,
  },
  glowingIcon: {
    width: 64 * scale,
    height: 64 * scale,
    borderRadius: 32 * scale,
    backgroundColor: "#f2ca50",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f2ca50",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10 * scale,
    elevation: 5,
  },
  successLabel: {
    fontFamily: "JetBrains_Mono-Medium",
    fontSize: 12 * scale,
    color: "#f2ca50",
    letterSpacing: 2.4 * scale,
    textAlign: "center",
  },
  successTypography: {
    alignItems: "center",
    marginBottom: 50 * scale,
  },
  successTitle: {
    fontFamily: "Urbanist-Bold",
    fontSize: 32 * scale,
    color: "#e2e2e2",
    textAlign: "center",
    letterSpacing: -0.32 * scale,
    marginBottom: 16 * scale,
  },
  successSubtitle: {
    fontFamily: "Urbanist-Regular",
    fontSize: 16 * scale,
    color: "#d0c5af",
    textAlign: "center",
    lineHeight: 26 * scale,
  },
  successButtons: {
    width: "100%",
    paddingHorizontal: 20 * scale,
    marginBottom: 20 * scale,
  },
  getStartedBtn: {
    height: 61 * scale,
    borderRadius: 12 * scale,
    backgroundColor: "#f2ca50",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#d4af37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 7.5 * scale,
    elevation: 4,
    marginBottom: 24 * scale,
  },
  getStartedText: {
    fontFamily: "Urbanist-ExtraBold",
    fontSize: 16 * scale,
    color: "#241a00",
    letterSpacing: 0.8 * scale,
  },
  needHelpBtn: {
    height: 45 * scale,
    alignItems: "center",
    justifyContent: "center",
  },
  needHelpText: {
    fontFamily: "JetBrains_Mono-Medium",
    fontSize: 12 * scale,
    color: "#d0c5af",
    letterSpacing: 1.2 * scale,
  },
});
