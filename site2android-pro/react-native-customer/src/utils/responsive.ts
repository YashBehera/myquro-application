import { Dimensions, PixelRatio, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Baseline guideline dimensions (standard modern phone: iPhone 14/15/16 baseline)
const BASELINE_WIDTH = 390;
const BASELINE_HEIGHT = 844;

/**
 * Standard horizontal scale factor clamped to prevent excessive shrinking or enlargement
 * - Min bound: 0.78 (for ~320-360px small screens)
 * - Max bound: 1.30 (for large phones / tablets)
 */
export const SCALE = Math.min(Math.max(SCREEN_WIDTH / BASELINE_WIDTH, 0.78), 1.30);

/**
 * Scale horizontally based on standard guideline width
 */
export const scale = (size: number): number => {
  return Math.round(size * (SCREEN_WIDTH / BASELINE_WIDTH));
};

/**
 * Scale vertically based on standard guideline height
 */
export const verticalScale = (size: number): number => {
  return Math.round(size * (SCREEN_HEIGHT / BASELINE_HEIGHT));
};

/**
 * Moderate scale for fonts, icons, and paddings where full linear scaling is too drastic
 * @param size Target size in Figma baseline
 * @param factor Weighting factor between linear scale and fixed size (default: 0.5)
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return Math.round(size + (scale(size) - size) * factor);
};

/**
 * Width percentage helper
 * e.g., wp(90) -> 90% of screen width
 */
export const wp = (percentage: number): number => {
  return (SCREEN_WIDTH * percentage) / 100;
};

/**
 * Height percentage helper
 * e.g., hp(50) -> 50% of screen height
 */
export const hp = (percentage: number): number => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

/**
 * Scaled font size with clamp
 */
export const scaledFontSize = (size: number): number => {
  const fontScale = PixelRatio.getFontScale();
  // Bound the accessibility fontScale to avoid broken layouts
  const boundedFontScale = Math.min(Math.max(fontScale, 0.9), 1.25);
  return Math.round(moderateScale(size, 0.4) * (1 / boundedFontScale));
};

export const isSmallDevice = SCREEN_WIDTH < 360;
export const isMediumDevice = SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414 && SCREEN_WIDTH < 600;
export const isTablet = SCREEN_WIDTH >= 600;

export const MAX_CONTENT_WIDTH = 640;

/**
 * Robust Cross-Platform Safe Area Top Padding Calculator
 * Handles Dynamic Island, notches, edge-to-edge Android status bars, and classic screens
 */
export const getSafeTopPadding = (insetsTop?: number, extraPadding: number = 0): number => {
  const systemInset = insetsTop ?? 0;
  const fallbackTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;
  return Math.max(systemInset, fallbackTop) + extraPadding;
};

/**
 * Robust Cross-Platform Safe Area Bottom Padding Calculator
 * Handles iPhone Home Indicator (34px), Android 3-Button Navigation bar (48px), and gesture navigation
 */
export const getSafeBottomPadding = (insetsBottom?: number, minBottom: number = 14): number => {
  const systemInset = insetsBottom ?? 0;
  return Math.max(systemInset, minBottom);
};

/**
 * Comprehensive Dynamic Responsive Hook for Multi-Device Adaptation
 * Re-evaluates dynamically on orientation changes, split-screen, and foldables
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const scaleH = (size: number): number => Math.round(size * (width / BASELINE_WIDTH));
  const scaleV = (size: number): number => Math.round(size * (height / BASELINE_HEIGHT));
  const modScale = (size: number, factor: number = 0.5): number =>
    Math.round(size + (scaleH(size) - size) * factor);
  const widthPct = (pct: number): number => (width * pct) / 100;
  const heightPct = (pct: number): number => (height * pct) / 100;

  const fontScale = PixelRatio.getFontScale();
  const boundedFontScale = Math.min(Math.max(fontScale, 0.9), 1.25);
  const getFontSize = (size: number): number =>
    Math.round(modScale(size, 0.4) * (1 / boundedFontScale));

  const isSmall = width < 360;
  const isMedium = width >= 360 && width < 414;
  const isLarge = width >= 414 && width < 600;
  const isTab = width >= 600;
  const isLandscape = width > height;

  const safeTop = getSafeTopPadding(insets.top);
  const safeBottom = getSafeBottomPadding(insets.bottom);
  const dynamicScale = Math.min(Math.max(width / BASELINE_WIDTH, 0.78), 1.30);

  return {
    width,
    height,
    insets,
    scale: scaleH,
    verticalScale: scaleV,
    moderateScale: modScale,
    scaledFontSize: getFontSize,
    wp: widthPct,
    hp: heightPct,
    SCALE: dynamicScale,
    isSmallDevice: isSmall,
    isMediumDevice: isMedium,
    isLargeDevice: isLarge,
    isTablet: isTab,
    isLandscape,
    safeTop,
    safeBottom,
    maxContentWidth: isTab ? 720 : width,
  };
};

export { SCREEN_WIDTH, SCREEN_HEIGHT, BASELINE_WIDTH, BASELINE_HEIGHT };
