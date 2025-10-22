/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // KOLINK Brand Colors
        primary: {
          DEFAULT: "#F9D65C",
          light: "#FBEAA0",
          dark: "#F4C81E"
        },
        secondary: {
          DEFAULT: "#1E1E1E",
          light: "#2A2A2A",
          dark: "#0F0F0F"
        },
        background: {
          light: "#FFFFFF",
          dark: "#0F0F0F"
        },
        surface: {
          light: "#F8F9FA",
          dark: "#1E1E1E"
        },
        text: {
          light: "#1E1E1E",
          dark: "#FFFFFF"
        },
        accent: {
          DEFAULT: "#F9D65C",
          gold: "#D4AF37",
          muted: "#FEF3CD"
        },
        border: {
          light: "#E5E7EB",
          dark: "#2A2A2A"
        }
      },
      fontFamily: {
        sans: ["Inter", "Satoshi", "system-ui", "sans-serif"]
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" }
        },
        "scale-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out"
      }
    }
  },
  plugins: []
}
