import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0078D4", // Azure Blue
        },
        secondary: {
          DEFAULT: "#FF6B35", // Safety Orange
        },
        success: "#28A745",
        warning: "#FFC107",
        error: "#DC3545",
        background: "#F5F5F5",
        text: {
          DEFAULT: "#212529",
          muted: "#6C757D",
        },
      },
      spacing: {
        // Compact mode: 4px base
        // Comfort mode: 8px base (default)
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;

