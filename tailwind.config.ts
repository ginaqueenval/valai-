import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        valbg: "#070A0F",
        valcard: "#0B1220",
        valelev: "#11192B",
        valtext: "#E7EDF7",
        valmuted: "#9AA7BD",
        valaccent: "#00FF9A",
        valhover: "#00D47E",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "system-ui",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        apple: "0 8px 32px rgba(0,0,0,0.4)",
        "apple-lg": "0 20px 60px rgba(0,0,0,0.5)",
        "cta-hover": "0 8px 24px rgba(0,255,154,0.18)",
        "send-glow": "0 4px 16px rgba(0,255,154,0.32)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "pulse-dot": "pulse-dot 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in": "fade-in 0.42s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up": "slide-up 0.32s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
