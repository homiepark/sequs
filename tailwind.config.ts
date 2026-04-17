import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        bg: "#0d0d14",
        sf: "#16161f",
        sf2: "#1e1e2a",
        bd: "#303044",
        acc: "#e8ff47",
        acc2: "#ff6b35",
        tx: "#eeeef8",
        mu: "#a8a8c4",
        t1: "#ff6b35",
        t2: "#3ecfff",
        t3: "#b07fff",
        t4: "#ff4fad",
        red: "#ff4757",
        green: "#23d160",
        orange: "#ffaa00",
      },
      fontFamily: {
        bebas: ["var(--font-bebas)", "sans-serif"],
        sans: ["var(--font-noto)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
