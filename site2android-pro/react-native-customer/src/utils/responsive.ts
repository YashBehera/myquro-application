import { Dimensions, PixelRatio, Platform } from 'react-native';

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

export { SCREEN_WIDTH, SCREEN_HEIGHT, BASELINE_WIDTH, BASELINE_HEIGHT };
