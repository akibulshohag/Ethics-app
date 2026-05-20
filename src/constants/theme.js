import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Colors
export const COLORS = {
  // Primary Colors
  primaryOrange: '#FF6A3D',
  primaryOrangeLight: '#FF8C66',
  /** Gradient / pressed states */
  primaryOrangeDeep: '#E6532A',
  primaryOrangeDark: '#B93C16',
  /** Warm surfaces (modals, sheets) tinted with brand */
  surfaceOrange: '#FFF5F1',
  surfaceOrangeSoft: '#FFFAF8',
  brandOverlay08: 'rgba(255, 106, 61, 0.08)',
  brandOverlay12: 'rgba(255, 106, 61, 0.12)',
  brandOverlay16: 'rgba(255, 106, 61, 0.16)',
  brandBorderSoft: 'rgba(255, 106, 61, 0.24)',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  darkCharcoal: '#15171C',

  // Grays
  gray100: '#F8F9FB',
  gray200: '#EEF0F4',
  gray300: '#E2E5EA',
  gray400: '#CAD0DA',
  gray500: '#9FA8B7',
  gray600: '#6D7788',
  gray700: '#4C5563',
  gray800: '#27303D',

  // Backgrounds
  backgroundWhite: '#FFFFFF',
  backgroundLight: '#F3F5F8',

  // Text Colors
  textPrimary: '#161B22',
  textSecondary: '#4F5A6B',
  textTertiary: '#7F8A9D',
  textWhite: '#FFFFFF',

  // Status Colors
  success: '#12B76A',
  error: '#EF4444',
  warning: '#F7A941',
  info: '#3B82F6',
  successSoft: '#E9F8EF',
  errorSoft: '#FDEEEE',
};

/** LinearGradient stops — use with `react-native-linear-gradient` */
export const ORANGE_GRADIENT_HEADER = [
  COLORS.primaryOrangeLight,
  COLORS.primaryOrange,
  COLORS.primaryOrangeDeep,
];
/** Publish / primary actions — centered on #FF7F0B */
export const ORANGE_GRADIENT_CTA = [
  '#FF9F7A',
  COLORS.primaryOrange,
  COLORS.primaryOrangeDeep,
];

// Typography
export const FONTS = {
  // Font Families (if using custom fonts)
  regular: 'System',
  medium: 'System',
  bold: 'System',

  // Font Sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 42,
  xxxxxl: 48,

  // Font Weights
  thin: '300',
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
  black: '900',
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  xxxxl: 40,
  xxxxxl: 50,
};

// Border Radius
export const BORDER_RADIUS = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 30,
  xxxl: 35,
  full: 9999,
};

// Shadows
export const SHADOWS = {
  small: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  large: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
  orange: {
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    elevation: 8,
  },
};

// Dimensions
export const DIMENSIONS = {
  screenWidth: width,
  screenHeight: height,
  buttonHeight: 70,
  inputHeight: 60,
  dotSize: 8,
  dotSizeActive: 20,
  dotSpacing: 6,
};

// Common Styles
export const COMMON_STYLES = {
  // Containers
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundWhite,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Text Styles
  h1: {
    fontSize: FONTS.xxxxl,
    fontWeight: FONTS.extraBold,
    color: COLORS.textPrimary,
    lineHeight: 56,
    letterSpacing: -1,
  },
  h2: {
    fontSize: FONTS.xxxxl,
    fontWeight: FONTS.extraBold,
    color: COLORS.textPrimary,
    lineHeight: 50,
  },
  bodyLarge: {
    fontSize: FONTS.lg,
    color: COLORS.textSecondary,
    lineHeight: 26,
  },
  bodyMedium: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: FONTS.sm,
    color: COLORS.textTertiary,
    lineHeight: 22,
  },

  // Button Styles
  primaryButton: {
    backgroundColor: COLORS.darkCharcoal,
    height: DIMENSIONS.buttonHeight,
    borderRadius: BORDER_RADIUS.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xxl,
    ...SHADOWS.large,
  },
  orangeButton: {
    backgroundColor: COLORS.primaryOrange,
    height: DIMENSIONS.buttonHeight,
    borderRadius: BORDER_RADIUS.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xxl,
    ...SHADOWS.orange,
  },

  // Input Styles
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.xxxl,
    paddingHorizontal: SPACING.xxl,
    height: DIMENSIONS.inputHeight,
  },
  inputActive: {
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
    backgroundColor: '#FFF5EE',
  },

  // Dot Pagination
  dot: {
    width: DIMENSIONS.dotSize,
    height: DIMENSIONS.dotSize,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray700,
    marginHorizontal: DIMENSIONS.dotSpacing,
  },
  activeDot: {
    backgroundColor: COLORS.primaryOrange,
    width: DIMENSIONS.dotSizeActive,
  },

  // Arrow Circle
  arrowCircle: {
    backgroundColor: COLORS.white,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export default {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  DIMENSIONS,
  COMMON_STYLES,
};
