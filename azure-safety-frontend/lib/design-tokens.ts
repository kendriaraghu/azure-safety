/**
 * Design Tokens for Azure Safety
 * Based on seed: 56145965ece38445616781a326502fc0feea8f36b4c131e1dbbca21164ad65a4
 */

export const designTokens = {
  colors: {
    primary: "#0078D4", // Azure Blue
    secondary: "#FF6B35", // Safety Orange
    success: "#28A745",
    warning: "#FFC107",
    error: "#DC3545",
    background: {
      light: "#F5F5F5",
      dark: "#1A1A1A",
    },
    text: {
      primary: "#212529",
      secondary: "#6C757D",
      light: "#FFFFFF",
    },
  },
  spacing: {
    compact: {
      base: 4,
      scale: [4, 8, 12, 16, 24, 32],
    },
    comfort: {
      base: 8,
      scale: [8, 16, 24, 32, 48, 64],
    },
  },
  breakpoints: {
    mobile: 640,
    tablet: 1024,
    desktop: 1024,
  },
} as const;

