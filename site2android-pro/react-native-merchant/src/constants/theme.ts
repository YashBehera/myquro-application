export const Colors = {
  primary: {
    main: '#FF6B00',
    light: '#FF8833',
    dark: '#E05D00',
    surface: '#FFF5EE',
  },
  secondary: {
    main: '#1A1D26',
    light: '#2A2E3D',
    dark: '#0F1117',
    surface: '#F4F5F7',
  },
  accent: {
    yellow: '#FFC107',
    green: '#10B981',
    red: '#EF4444',
    blue: '#3B82F6',
  },
  neutral: {
    white: '#FFFFFF',
    background: '#FAFAFA',
    card: '#FFFFFF',
    textDark: '#111827',
    textMedium: '#4B5563',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    divider: '#F3F4F6',
  },
};

export const Typography = {
  families: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    heading: 30,
    display: 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  radii: BorderRadii,
  shadows: Shadows,
};

export default Theme;
