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
        bg: "var(--bg)",
        "bg-elev": "var(--bg-elev)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "border-gold": "var(--border-gold)",
        gold: {
          DEFAULT: "var(--gold)",
          soft: "var(--gold-soft)",
          hi: "var(--gold-hi)",
          deep: "var(--gold-deep)",
        },
        text: {
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
          faint: "var(--text-faint)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        info: "var(--info)",
        danger: "var(--danger)",
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
        card: "12px",
        btn: "10px",
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
