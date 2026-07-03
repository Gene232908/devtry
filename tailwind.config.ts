import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./config/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { xl: "1200px" },
    },
    extend: {
      colors: {
        bg: "rgb(var(--bg-rgb) / <alpha-value>)",
        "bg-elev": "rgb(var(--bg-elev-rgb) / <alpha-value>)",
        panel: "rgb(var(--bg-panel-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2-rgb) / <alpha-value>)",
        border: "rgb(var(--border-rgb) / <alpha-value>)",
        "border-gold": "rgb(var(--border-gold-rgb) / <alpha-value>)",
        gold: {
          DEFAULT: "rgb(var(--gold-rgb) / <alpha-value>)",
          soft: "rgb(var(--gold-soft-rgb) / <alpha-value>)",
          hi: "rgb(var(--gold-hi-rgb) / <alpha-value>)",
          deep: "rgb(var(--gold-deep-rgb) / <alpha-value>)",
        },
        text: {
          DEFAULT: "rgb(var(--text-rgb) / <alpha-value>)",
          muted: "rgb(var(--text-muted-rgb) / <alpha-value>)",
          faint: "rgb(var(--text-faint-rgb) / <alpha-value>)",
        },
        success: "rgb(var(--success-rgb) / <alpha-value>)",
        warning: "rgb(var(--warning-rgb) / <alpha-value>)",
        info: "rgb(var(--info-rgb) / <alpha-value>)",
        danger: "rgb(var(--danger-rgb) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "Arial", "Helvetica", "sans-serif"],
      },
      fontSize: {
        "fluid--1": "var(--step--1)",
        "fluid-0": "var(--step-0)",
        "fluid-1": "var(--step-1)",
        "fluid-2": "var(--step-2)",
        "fluid-3": "var(--step-3)",
        "fluid-4": "var(--step-4)",
        "fluid-5": "var(--step-5)",
      },
      borderRadius: {
        card: "8px",
        btn: "999px",
      },
      letterSpacing: {
        caps: "0.22em",
        "caps-wide": "0.3em",
      },
      spacing: {
        section: "clamp(5rem, 4rem + 5vw, 8rem)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(52,199,123,.55)" },
          "50%": { boxShadow: "0 0 0 10px rgba(52,199,123,0)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "flash-in": {
          "0%": { backgroundColor: "rgba(212,175,55,.25)" },
          "100%": { backgroundColor: "transparent" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-6px)" },
          "75%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2.4s ease-out infinite",
        "fade-in": "fade-in 200ms ease-out",
        "flash-in": "flash-in 1.6s ease-out",
        shake: "shake 0.35s ease-in-out",
      },
    },
  },
  plugins: [],
};
export default config;
