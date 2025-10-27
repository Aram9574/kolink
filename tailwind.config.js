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
        primary: {
          DEFAULT: "#0373FE",
          light: "#2D8CFF",
          dark: "#0256C4"
        },
        secondary: {
          DEFAULT: "#0F172A",
          light: "#1E293B",
          dark: "#020617"
        },
        background: {
          light: "#FFFFFF",
          dark: "#020617"
        },
        surface: {
          light: "#F5F6F9",
          dark: "#131C2E"
        },
        text: {
          light: "#0F172A",
          dark: "#F8FAFC"
        },
        accent: {
          DEFAULT: "#1BC47D",
          soft: "#DEF8EC"
        },
        "accent-muted": "#DEF8EC",
        border: {
          light: "#E2E8F0",
          dark: "#1E293B"
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
