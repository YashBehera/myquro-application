import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationEnd: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationEnd }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.bezier(0.16, 1, 0.3, 1), // cubic-bezier equivalent of EaseOutExpo
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 800,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
    ]).start();

    const timeout = setTimeout(() => {
      onAnimationEnd();
    }, 1500); // Show splash for 1.5s before transitioning

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: opacity,
            transform: [{ scale: scale }],
          },
        ]}
      >
        <Text style={styles.myText}>My</Text>
        <View style={styles.imageContainer}>
          <Image
            source={require('../assets/images/quro-logo-text.png')}
            style={styles.logoImage}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#191919',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myText: {
    fontFamily: 'Fasthand-Regular',
    fontSize: 80,
    color: '#deb853',
    letterSpacing: -2.4,
    marginRight: 0, // slight overlap/margin for the image
  },
  imageContainer: {
    width: 181,
    height: 82,
    overflow: 'hidden',
  },
  logoImage: {
    position: 'absolute',
    width: 310,
    height: 149,
    left: -125,
    top: -35,
  },
});
