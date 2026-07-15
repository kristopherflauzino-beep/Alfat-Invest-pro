import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial"]
      },
      boxShadow: {
        premium: "0 22px 70px rgba(15, 23, 42, 0.16)",
        glow: "0 0 0 1px rgba(20, 184, 166, 0.16), 0 18px 65px rgba(20, 184, 166, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
