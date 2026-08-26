import { Platform, StatusBar } from 'react-native';
import {
  SCALE,
  moderateScale,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  MAX_CONTENT_WIDTH,
} from '../../utils/responsive';

export const scale = SCALE;
export { SCALE, moderateScale, isTablet, isSmallDevice, SCREEN_WIDTH, SCREEN_HEIGHT, MAX_CONTENT_WIDTH };
export const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 0);

export const getInitials = (name: string) => {
  if (!name) return 'DK';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};
