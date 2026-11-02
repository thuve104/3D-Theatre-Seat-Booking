import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cinema: {
          obsidian: "#070709",
          charcoal: "#111217",
          slate: "#1C1E26",
          crimson: "#E50914",
          crimsonDark: "#99060D",
          gold: "#D4AF37",
          goldLight: "#F3E5AB",
        },
        seat: {
          available: "#22C55E",
          occupied: "#EF4444",
          selected: "#EAB308",
          reserved: "#3B82F6",
          unavailable: "#6B7280",
        },
      },
      backgroundImage: {
        "cinema-vignette":
          "radial-gradient(circle at 50% 20%, rgba(229, 9, 20, 0.16), rgba(7, 7, 9, 0.98) 75%)",
        "gold-shimmer":
          "linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(17, 18, 23, 0.95) 100%)",
      },
      boxShadow: {
        "crimson-glow": "0 0 28px -4px rgba(229, 9, 20, 0.55)",
        "gold-glow": "0 0 25px -4px rgba(212, 175, 55, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
