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
      screens: { xl: "1280px", "2xl": "1440px" },
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
        ivory: "rgb(var(--ivory-rgb) / <alpha-value>)",
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
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "marquee-reverse": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
        shine: {
          "0%": { transform: "translateX(-130%) skewX(-12deg)" },
          "55%, 100%": { transform: "translateX(240%) skewX(-12deg)" },
        },
        "cta-pulse": {
          "0%, 100%": { boxShadow: "0 20px 44px -22px rgba(244,227,168,.9), 0 0 0 0 rgba(244,227,168,.45)" },
          "50%": { boxShadow: "0 22px 48px -20px rgba(244,227,168,1), 0 0 0 12px rgba(244,227,168,0)" },
        },
        "ad-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "ping-ring": {
          "0%": { transform: "scale(0.7)", opacity: "0.7" },
          "80%, 100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(28px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "step-in": {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "progress-fill": {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
        "page-intro": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "hero-focus": {
          "0%": { opacity: "0", filter: "blur(18px)", transform: "scale(1.06)" },
          "60%": { opacity: "1" },
          "100%": { opacity: "1", filter: "blur(0)", transform: "scale(1)" },
        },
        "hero-rise": {
          "0%": { opacity: "0", filter: "blur(6px)", transform: "translateY(20px)" },
          "100%": { opacity: "1", filter: "blur(0)", transform: "translateY(0)" },
        },
        "overlay-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "overlay-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        // Settles rather than bounces — the slight overshoot on scale reads as
        // responsive without feeling springy on a confirmation prompt.
        "pop-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(.94)" },
          "60%": { opacity: "1", transform: "translateY(0) scale(1.008)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "pop-out": {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(8px) scale(.97)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2.4s ease-out infinite",
        "fade-in": "fade-in 200ms ease-out",
        "flash-in": "flash-in 1.6s ease-out",
        shake: "shake 0.35s ease-in-out",
        marquee: "marquee 34s linear infinite",
        "marquee-slow": "marquee 90s linear infinite",
        "marquee-reverse": "marquee-reverse 34s linear infinite",
        shine: "shine 3.4s ease-in-out infinite",
        "cta-pulse": "cta-pulse 2.6s ease-in-out infinite",
        "ad-float": "ad-float 4.5s ease-in-out infinite",
        "ping-ring": "ping-ring 2.4s ease-out infinite",
        "slide-in": "slide-in 550ms ease-out",
        "step-in": "step-in 260ms cubic-bezier(.16,.84,.44,1) both",
        "progress-fill": "progress-fill 7000ms linear forwards",
        "page-intro": "page-intro 0.45s ease-out both",
        "hero-focus": "hero-focus 1.7s cubic-bezier(.16,.84,.44,1) both",
        "hero-rise": "hero-rise 1s cubic-bezier(.16,.84,.44,1) both",
        "overlay-in": "overlay-in 180ms ease-out both",
        "overlay-out": "overlay-out 160ms ease-in both",
        "pop-in": "pop-in 260ms cubic-bezier(.16,.84,.44,1) both",
        "pop-out": "pop-out 160ms cubic-bezier(.4,0,1,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
