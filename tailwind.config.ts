import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
        },
        // Legacy dark-section palette — kept for the footer and any section
        // that still wants a deep contrast band.
        navy: {
          50: "#EEF2F5",
          100: "#D7E0E6",
          400: "#3D5A70",
          700: "#123246",
          800: "#0D2636",
          900: "#0A1E2B",
          950: "#071620",
        },
        gold: {
          400: "#D9AE5C",
          500: "#C6963A",
          600: "#A87A28",
        },
        // Owner.com-referenced palette. `ink` is the text/border scale,
        // `mint` is the single primary CTA green, `cream` is the warm
        // off-white section background used to alternate with white.
        ink: {
          900: "#2C2C2C", // main text
          700: "#4B4B4B",
          500: "#7C7C7C", // secondary text
          400: "#9A9A9A",
          200: "#D1D5DB",
          100: "#E5E7EB", // standard border
        },
        mint: {
          50: "#EAF2EC",
          100: "#D2E4D7",
          400: "#1F7A36",
          500: "#094413", // primary CTA green
          600: "#06330E", // hover
          900: "#031C08",
        },
        cream: {
          50: "#F9F3ED", // warm section background
          100: "#F0E4D4",
        },
        pink: {
          50: "#F9F3ED",
          100: "#F0E4D4",
          400: "#D9C7AE",
          500: "#B8966B",
        },
      },
      fontFamily: {
        serif: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.035em",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
