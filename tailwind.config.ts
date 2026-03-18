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
        background: "var(--background)",
        foreground: "var(--foreground)",
        cx: {
          bg:             "var(--cx-bg)",
          surface:        "var(--cx-surface)",
          "surface-2":    "var(--cx-surface-2)",
          "surface-3":    "var(--cx-surface-3)",
          border:         "var(--cx-border)",
          "border-2":     "var(--cx-border-2)",
          text:           "var(--cx-text)",
          "text-2":       "var(--cx-text-2)",
          "text-3":       "var(--cx-text-3)",
          accent:         "var(--cx-accent)",
          "accent-2":     "var(--cx-accent-2)",
          "accent-muted": "var(--cx-accent-muted)",
          "accent-glow":  "var(--cx-accent-glow)",
          green:          "var(--cx-green)",
          red:            "var(--cx-red)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      animation: {
        "fade-in":   "fade-in 0.4s ease both",
        "slide-up":  "slide-up 0.5s ease both",
        "spin-slow": "spin-slow 1.2s linear infinite",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)"   },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)"    },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)"   },
          to:   { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
