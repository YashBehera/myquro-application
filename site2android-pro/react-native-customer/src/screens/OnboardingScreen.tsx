import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Easing,
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
  SvgXml,
} from "react-native-svg";

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

interface OnboardingScreenProps {
  onFinished: () => void;
}

const GOLD_ARC_XML = `<svg preserveAspectRatio="none" width="100%" height="100%" overflow="visible" style="display: block;" viewBox="0 0 384 811.46" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Group 48095698">
<g id="Gradient+Blur" filter="url(#filter0_f_2015_82)">
<rect x="40" y="471.46" width="300" height="300" rx="150" fill="url(#paint0_radial_2015_82)"/>
</g>
<g id="Gradient+Blur_2" filter="url(#filter1_f_2015_82)">
<rect x="44" y="40" width="300" height="300" rx="150" fill="url(#paint1_radial_2015_82)"/>
</g>
<path id="Subtract" d="M264 224.145C183.554 247.915 124.698 324.122 124.698 414.46C124.698 504.798 183.554 581.003 264 604.774V695.92C138.547 669.719 44 553.664 44 414.46C44 275.256 138.547 159.201 264 133V224.145Z" fill="url(#paint2_linear_2015_82)"/>
</g>
<defs>
<filter id="filter0_f_2015_82" x="0" y="431.46" width="380" height="380" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="20" result="effect1_foregroundBlur_2015_82"/>
</filter>
<filter id="filter1_f_2015_82" x="4" y="0" width="380" height="380" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="20" result="effect1_foregroundBlur_2015_82"/>
</filter>
<radialGradient id="paint0_radial_2015_82" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(190 621.46) scale(212.132)">
<stop stop-color="#D4AF37" stop-opacity="0.15"/>
<stop offset="0.7" stop-color="#D4AF37" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint1_radial_2015_82" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(194 190) scale(212.132)">
<stop stop-color="#D4AF37" stop-opacity="0.15"/>
<stop offset="0.7" stop-color="#D4AF37" stop-opacity="0"/>
</radialGradient>
<linearGradient id="paint2_linear_2015_82" x1="154" y1="133" x2="154" y2="695.92" gradientUnits="userSpaceOnUse">
<stop stop-color="#EEC74D"/>
<stop offset="1" stop-color="#88722C"/>
</linearGradient>
</defs>
</svg>`;

const Logo: React.FC<{ style?: any }> = ({ style }) => (
  <View style={[styles.logoContainer, style]}>
    <Text style={styles.logoMyText}>My</Text>
    <View style={styles.logoImageContainer}>
      <Image
        source={require("../assets/images/quro-logo-text.png")}
        style={styles.logoImage}
      />
    </View>
  </View>
);

const LogoSmall: React.FC = () => (
  <View style={styles.logoSmallContainer}>
    <Text style={styles.logoSmallMyText}>My</Text>
    <View style={styles.logoSmallImageContainer}>
      <Image
        source={require("../assets/images/quro-logo-text.png")}
        style={styles.logoSmallImage}
      />
    </View>
  </View>
);

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onFinished,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [subHeaderType, setSubHeaderType] = useState<"noodle" | "salad">(
    "noodle",
  );

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const transitionVal = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (currentIndex === 0) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(1);
        setSubHeaderType("noodle");
        transitionVal.setValue(0);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      });
    } else if (currentIndex === 1) {
      // Animate dishes rotation & subheader swap
      Animated.parallel([
        Animated.timing(transitionVal, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.timing(textFadeAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(textFadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setCurrentIndex(2);
      });

      setTimeout(() => {
        setSubHeaderType("salad");
      }, 250);
    } else {
      onFinished();
    }
  };

  const handleSkip = () => {
    onFinished();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleNext();
    }, 2500);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  // Interpolated coordinates for circular rotation transitions
  // 1. Noodles Position (Center large -> Top small)
  const noodleLeft = transitionVal.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      211.55 * scale,
      245 * scale,
      285 * scale,
      305 * scale,
      314 * scale,
    ],
  });

  const noodleTop = transitionVal.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      368 * scale,
      315 * scale,
      265 * scale,
      230 * scale,
      217 * scale,
    ],
  });
  const noodleWidth = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [203.2 * scale, 108 * scale],
  });
  const noodleHeight = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [209 * scale, 108 * scale],
  });
  const noodleBorderRadius = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [102 * scale, 54 * scale],
  });

  // Noodles Inner Crop
  const noodleImgWidth = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [290 * scale, 154 * scale],
  });
  const noodleImgHeight = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [372 * scale, 192 * scale],
  });
  const noodleImgLeft = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [-44 * scale, -24 * scale],
  });
  const noodleImgTop = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [-102 * scale, -53 * scale],
  });

  // 2. Salad Position (Bottom small -> Center large)
  const saladLeft = transitionVal.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      314 * scale,
      300 * scale,
      275 * scale,
      240 * scale,
      211.55 * scale,
    ],
  });

  const saladTop = transitionVal.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      622 * scale,
      575 * scale,
      505 * scale,
      430 * scale,
      368 * scale,
    ],
  });
  const saladWidth = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [108 * scale, 203.2 * scale],
  });
  const saladHeight = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [108 * scale, 209 * scale],
  });
  const saladBorderRadius = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [54 * scale, 102 * scale],
  });

  // Salad Inner Crop
  const saladImgWidth = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [120 * scale, 226.97 * scale],
  });
  const saladImgHeight = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [185 * scale, 350.15 * scale],
  });
  const saladImgLeft = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [-7 * scale, -13.65 * scale],
  });
  const saladImgTop = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [-56 * scale, -105.96 * scale],
  });

  // 3. Prawns Position (Top small -> Slides out/teleports -> Bottom small)
  const prawnOpacity = transitionVal.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: [1, 0, 0, 1],
  });
  const prawnLeft = transitionVal.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: [314 * scale, 350 * scale, 350 * scale, 314 * scale],
  });
  const prawnTop = transitionVal.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: [217 * scale, 100 * scale, 730 * scale, 622 * scale],
  });

  // 4. FRY PARWN Badge (Slides with prawns top -> bottom)
  const prawnBadgeLeft = transitionVal.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: [221 * scale, 240 * scale, 240 * scale, 185 * scale],
  });
  const prawnBadgeTop = transitionVal.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: [180 * scale, 80 * scale, 800 * scale, 730 * scale],
  });

  // 5. VEG SALAD'S Badge (Slides from bottom salad -> top noodles)
  const saladBadgeOpacity = transitionVal.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: [1, 0, 0, 1],
  });
  const saladBadgeLeft = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [207 * scale, 193 * scale],
  });
  const saladBadgeTop = transitionVal.interpolate({
    inputRange: [0, 1],
    outputRange: [738 * scale, 175 * scale],
  });

  const renderContent = () => {
    if (currentIndex === 0) {
      return (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000000" }]}>
          <Image
            source={require("../assets/images/background_onboarding.png")}
            style={{
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
            }}
            resizeMode="cover"
          />
        </View>
      );
    }

    // Combined screens case 1 & case 2 for active animated rotation transition
    return (
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000000" }]}>
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Svg
            style={StyleSheet.absoluteFillObject}
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
          >
            <Defs>
              <RadialGradient
                id="glowTopLeft"
                cx={0}
                cy={0}
                r={150 * scale}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%" stopColor="#d4af37" stopOpacity={0.15} />
                <Stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={0} cy={0} r={150 * scale} fill="url(#glowTopLeft)" />
          </Svg>
        </View>

        {/* Header Logo at x=57, y=35 */}
        <Logo style={styles.logoAbsolute} />

        {/* Skip Button */}
        <TouchableOpacity onPress={handleSkip} style={styles.skipAbsolute}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Title: What's your Go-To? */}
        <View style={styles.headerTextContainer}>
          <Text style={styles.bebasHeader}>WHAT'S YOUR{"\n"}GO-TO?</Text>
        </View>

        {/* Subheader (Animates opacity) */}
        <Animated.Text
          style={[
            subHeaderType === "noodle"
              ? styles.noodleSubheader
              : styles.saladSubheader,
            styles.subheaderAbsolute,
            { opacity: textFadeAnim },
          ]}
        >
          {subHeaderType === "noodle" ? "Soup’y NOODLE’S" : "Veg Salad’s"}
        </Animated.Text>

        {/* Description */}
        <Text style={[styles.descriptionText, styles.descriptionAbsolute]}>
          {subHeaderType === "noodle"
            ? "Comforting Asian broths paired with handcrafted noodles, served with signature My Quro elegance."
            : "Crisp garden vegetables tossed in handcrafted dressings, served with signature My Quro elegance."}
        </Text>

        {/* Order Now Button */}
        <TouchableOpacity
          style={styles.orderNowButtonAbsolute}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.orderNowButtonText}>ORDER NOW</Text>
        </TouchableOpacity>

        {/* Right Side: Exact Gold Arc SVG from Figma */}
        <View style={styles.svgArcAbsolute}>
          <SvgXml
            xml={GOLD_ARC_XML}
            width={384 * scale}
            height={811.46 * scale}
          />
        </View>

        {/* 1. Noodles */}
        <Animated.View
          style={[
            styles.foodCircleContainer,
            {
              left: noodleLeft,
              top: noodleTop,
              width: noodleWidth,
              height: noodleHeight,
              borderRadius: noodleBorderRadius,
            },
          ]}
        >
          <Animated.Image
            source={require("../assets/images/food-noodle.png")}
            style={{
              position: "absolute",
              width: noodleImgWidth,
              height: noodleImgHeight,
              left: noodleImgLeft,
              top: noodleImgTop,
            }}
            resizeMode="cover"
          />
        </Animated.View>

        {/* 2. Salad */}
        <Animated.View
          style={[
            styles.foodCircleContainer,
            {
              left: saladLeft,
              top: saladTop,
              width: saladWidth,
              height: saladHeight,
              borderRadius: saladBorderRadius,
            },
          ]}
        >
          <Animated.Image
            source={require("../assets/images/food-salad.png")}
            style={{
              position: "absolute",
              width: saladImgWidth,
              height: saladImgHeight,
              left: saladImgLeft,
              top: saladImgTop,
            }}
            resizeMode="cover"
          />
        </Animated.View>

        {/* 3. Prawns */}
        <Animated.View
          style={[
            styles.foodCircleContainer,
            {
              left: prawnLeft,
              top: prawnTop,
              width: 108 * scale,
              height: 108 * scale,
              borderRadius: 54 * scale,
              opacity: prawnOpacity,
            },
          ]}
        >
          <Image
            source={require("../assets/images/food-prawn.png")}
            style={styles.smallFoodPrawnImage}
            resizeMode="cover"
          />
        </Animated.View>

        {/* 4. FRY PARWN Badge */}
        <Animated.View
          style={[
            styles.badgeContainer,
            {
              position: "absolute",
              left: prawnBadgeLeft,
              top: prawnBadgeTop,
              width: 145 * scale,
              height: 25 * scale,
              opacity: prawnOpacity,
              zIndex: 20,
            },
          ]}
        >
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>FRY</Text>
          </View>
          <Text style={styles.badgeLabelText}>PRAWN</Text>
        </Animated.View>

        {/* 5. VEG SALAD'S Badge */}
        <Animated.View
          style={[
            styles.badgeContainer,
            {
              position: "absolute",
              left: saladBadgeLeft,
              top: saladBadgeTop,
              width: 145 * scale,
              height: 25 * scale,
              opacity: saladBadgeOpacity,
              zIndex: 20,
            },
          ]}
        >
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>VEG</Text>
          </View>
          <Text style={styles.badgeLabelText}>SALAD'S</Text>
        </Animated.View>

        {/* Footer rights */}
        <View style={styles.footerRightsAbsolute}>
          <Text style={styles.rightsText}>Rights reserved by </Text>
          <LogoSmall />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}
      >
        {renderContent()}
      </Animated.View>

      {/* Persistent Page Indicators & Controls at bottom */}
      {currentIndex === 3 && (
        <SafeAreaView
          style={styles.controlsOverlay}
          pointerEvents="box-none"
          edges={["bottom"]}
        >
          <View style={styles.controlsRow}>
            {/* Pagination Indicators (Dots) */}
            <View style={styles.indicatorContainer}>
              {[0, 1, 2].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentIndex
                      ? styles.activeDot
                      : styles.inactiveDot,
                  ]}
                />
              ))}
            </View>

            {/* CTA Next Button */}
            <TouchableOpacity
              style={[
                styles.ctaButton,
                styles.ctaButtonPageZero, // White button on poster page
              ]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>{"NEXT"}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  // Logo
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoMyText: {
    fontFamily: "Fasthand-Regular",
    fontSize: 30 * scale,
    color: "#deb853",
    letterSpacing: -0.9 * scale,
    marginRight: 2 * scale,
  },
  logoImageContainer: {
    width: 68 * scale,
    height: 31 * scale,
    overflow: "hidden",
  },
  logoImage: {
    position: "absolute",
    width: 122 * scale,
    height: 56 * scale,
    left: -49 * scale,
    top: -13 * scale,
  },
  // Small logo styles for footer
  logoSmallContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoSmallMyText: {
    fontFamily: "Fasthand-Regular",
    fontSize: 16 * scale,
    color: "#deb853",
    letterSpacing: -0.5 * scale,
    marginRight: 1 * scale,
  },
  logoSmallImageContainer: {
    width: 36 * scale,
    height: 16 * scale,
    overflow: "hidden",
  },
  logoSmallImage: {
    position: "absolute",
    width: 65 * scale,
    height: 29 * scale,
    left: -25 * scale,
    top: -7 * scale,
  },

  // Absolute positioning properties directly matching Figma coordinates
  introOneBg: {
    position: "absolute",
    width: 585 * scale,
    height: 1024 * scale,
    left: -98 * scale,
    top: 0,
  },
  logoAbsoluteIntro1: {
    position: "absolute",
    left: 45 * scale,
    top: 48 * scale,
  },
  logoAbsolute: {
    position: "absolute",
    left: 35 * scale,
    top: 60 * scale,
  },
  skipAbsolute: {
    position: "absolute",
    right: 12 * scale,
    top: 60 * scale,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    color: "#c0c0c0",
    fontSize: 14 * scale,
    fontWeight: "600",
  },
  // Title (What's your Go-To) at x=39, y=269
  headerTextContainer: {
    position: "absolute",
    left: 35 * scale,
    top: 320 * scale,
    width: 166 * scale,
    height: 90 * scale,
  },
  bebasHeader: {
    fontFamily: "BebasNeue-Regular",
    fontSize: 36 * scale,
    color: "#F2CA50",
    lineHeight: 45 * scale,
    letterSpacing: 1.8 * scale,
    textShadowColor: "rgba(212, 175, 55, 0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8 * scale,
  },
  // Subheader at x=39, y=413
  subheaderAbsolute: {
    position: "absolute",
    left: 35 * scale,
    top: 433 * scale,
  },
  noodleSubheader: {
    fontFamily: "Ultra-Regular",
    fontSize: 13 * scale,
    color: "#BE9F3D",
    textTransform: "uppercase",
  },
  saladSubheader: {
    fontFamily: "Urbanist-ExtraBold", // Match Urbanist:Black with extra bold weight
    fontWeight: "900",
    fontSize: 18 * scale,
    color: "#EAC44C",
    textTransform: "uppercase",
  },
  // Description at x=39, y=407
  descriptionAbsolute: {
    position: "absolute",
    left: 35 * scale,
    top: 465 * scale,
    width: 170 * scale,
    height: 129 * scale,
  },
  descriptionText: {
    fontFamily: "Urbanist-Regular",
    fontSize: 12 * scale, // Exact Figma description size
    color: "#FFFFFF",
    lineHeight: 18 * scale, // Exact Figma line-height
    opacity: 0.9,
  },
  // Order Now Button at x=39, y=516
  orderNowButtonAbsolute: {
    position: "absolute",
    left: 35 * scale,
    top: 536 * scale,
    width: 147 * scale,
    height: 36 * scale,
    backgroundColor: "#E7C14B",
    borderRadius: 10 * scale,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#E7C14B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6 * scale,
    elevation: 3,
  },
  orderNowButtonText: {
    fontFamily: "Urbanist-ExtraBold",
    fontWeight: "800",
    fontSize: 13 * scale,
    color: "#000000",
    letterSpacing: 0.5 * scale,
  },

  // Right Side: Exact Gold Arc SVG from Figma (x=176, y=58)
  svgArcAbsolute: {
    position: "absolute",
    left: 176 * scale,
    top: 58 * scale,
    width: 384 * scale,
    height: 811.46 * scale,
  },

  // Food circle general container properties
  foodCircleContainer: {
    position: "absolute",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    zIndex: 10,
  },
  smallFoodPrawnImage: {
    position: "absolute",
    width: 108 * scale,
    height: 108 * scale,
    left: 0,
    top: 0,
  },

  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  badgePill: {
    backgroundColor: "#E7C14B",
    width: 53 * scale,
    height: 25 * scale,
    borderRadius: 10 * scale,
    justifyContent: "center",
    alignItems: "center",
  },
  badgePillText: {
    fontFamily: "Ultra-Regular",
    fontWeight: "bold", // Explicit bold constraint
    fontSize: 12 * scale, // Exact Figma size for pill text
    color: "#000000", // Solid black text
  },
  badgeLabelText: {
    fontFamily: "Ultra-Regular",
    fontWeight: "bold", // Explicit bold constraint
    fontSize: 16 * scale, // Exact Figma label size
    color: "#FFFFFF",
    marginLeft: 8 * scale, // Corrected gap
  },

  // Footer rights at x=44, y=858
  footerRightsAbsolute: {
    position: "absolute",
    left: 44 * scale,
    top: 900 * scale,
    flexDirection: "row",
    alignItems: "center",
  },
  rightsText: {
    fontFamily: "Urbanist-Regular",
    fontSize: 12 * scale,
    color: "#c0c0c0",
  },

  // Controls Overlay (Indicators + Button)
  controlsOverlay: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    zIndex: 100,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  indicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: "#E7C14B",
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  ctaButton: {
    backgroundColor: "#E7C14B",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 130,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E7C14B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonPageZero: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
  },
  ctaButtonText: {
    fontFamily: "Urbanist-Bold",
    fontWeight: "700",
    fontSize: 14,
    color: "#000000",
    letterSpacing: 0.5,
  },
});
