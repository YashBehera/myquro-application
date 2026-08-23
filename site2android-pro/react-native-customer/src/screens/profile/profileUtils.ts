import { Dimensions, Platform, StatusBar } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
export const scale = Math.min(Math.max(SCREEN_WIDTH / 390, 0.9), 1.15);
export const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 0);

export const getInitials = (name: string) => {
  if (!name) return 'DK';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};
