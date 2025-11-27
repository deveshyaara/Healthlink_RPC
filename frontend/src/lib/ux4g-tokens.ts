/**
 * UX4G Design Tokens
 * Based on Indian Government UX Guidelines
 */

export const ux4gTokens = {
  // Typography - Noto Sans family
  fonts: {
    primary: 'Noto Sans, system-ui, sans-serif',
    display: 'Noto Sans Display, system-ui, sans-serif',
  },

  // Color Palette - Government compliance
  colors: {
    // Primary - Indian Government Blue
    primary: {
      50: '#E8F1F8',
      100: '#C5DCEE',
      200: '#9EC6E3',
      300: '#77AFD8',
      400: '#5A9ECF',
      500: '#3D8EC6',
      600: '#3786C0',
      700: '#2F7BB9',
      800: '#2771B1',
      900: '#1959A4',
    },

    // Secondary - Saffron/Orange
    secondary: {
      50: '#FFF3E0',
      100: '#FFE0B2',
      200: '#FFCC80',
      300: '#FFB74D',
      400: '#FFA726',
      500: '#FF9800',
      600: '#FB8C00',
      700: '#F57C00',
      800: '#EF6C00',
      900: '#E65100',
    },

    // Semantic Colors
    success: {
      50: '#E8F5E9',
      500: '#4CAF50',
      700: '#388E3C',
    },
    
    warning: {
      50: '#FFF8E1',
      500: '#FFC107',
      700: '#F57C00',
    },
    
    danger: {
      50: '#FFEBEE',
      500: '#F44336',
      700: '#D32F2F',
    },
    
    info: {
      50: '#E3F2FD',
      500: '#2196F3',
      700: '#1976D2',
    },

    // Neutral Colors
    neutral: {
      0: '#FFFFFF',
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
      1000: '#000000',
    },

    // Government Specific
    government: {
      blue: '#3D8EC6',
      saffron: '#FF9800',
      green: '#138808',
      navy: '#000080',
    },
  },

  // Typography Scale
  fontSize: {
    display: {
      large: '57px',
      medium: '45px',
      small: '36px',
    },
    headline: {
      large: '32px',
      medium: '28px',
      small: '24px',
    },
    title: {
      large: '22px',
      medium: '16px',
      small: '14px',
    },
    label: {
      large: '14px',
      medium: '12px',
      small: '11px',
    },
    body: {
      large: '16px',
      medium: '14px',
      small: '12px',
    },
  },

  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Font Weights
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Spacing Scale (8px base)
  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
  },

  // Border Radius
  radius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  // Z-Index Scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },

  // Breakpoints
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

export type UX4GTokens = typeof ux4gTokens;
