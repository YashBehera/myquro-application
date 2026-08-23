/**
 * Theme & Color tokens mapping Jetpack Compose specifications.
 *
 * Original Java/Kotlin Paths:
 * - /app/src/main/java/com/example/ui/theme/Color.kt
 * - /app/src/main/java/com/example/ui/theme/Theme.kt
 */

export const COLORS = {
  // Brand Base Palette
  quroRedPrimary: '#e03546',      // Crimson Red for active controls
  quroRedDark: '#c42333',         // Midnight crimson
  quroAmberAccent: '#FF9100',     // Glowing details
  quroGold: '#E8C547',            // Ratings elements & Gold accents
  quroBeigeBg: '#0B0B0B',         // Deep carbon background
  quroTextNavy: '#FFFFFF',        // Slate navy / White text
  quroTextSub: '#8E8E8E',         // Subtle steel text
  quroSurfaceCard: '#191919',     // Crisp container dark surface

  // Dark Scheme Palette
  quroDarkBg: '#0B0B0B',          // Deep carbon background
  quroDarkSurface: '#191919',     // M3 dark active surface
  quroDarkTextHeader: '#FFFFFF',  // Clear high-contrast white
  quroDarkTextSub: '#8E8E8E',     // Muted steel for midnight mode
  quroGoldenYellow: '#E8C547',    // Star colors
  quroDeepOrange: '#E65100',      // Hot embers gradient accent
};

export const THEME = {
  light: {
    background: '#0B0B0B',
    surface: '#191919',
    primary: COLORS.quroRedPrimary,
    text: '#FFFFFF',
    textMuted: '#8E8E8E',
    borderColor: '#2A2A2A',
  },
  dark: {
    background: '#0B0B0B',
    surface: '#191919',
    primary: COLORS.quroRedPrimary,
    text: '#FFFFFF',
    textMuted: '#8E8E8E',
    borderColor: '#2A2A2A',
  },
};
