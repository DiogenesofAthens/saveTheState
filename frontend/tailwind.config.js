/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1B2A4A",
          light: "#253C6B",
          dark: "#111B30",
        },
        "slate-blue": {
          DEFAULT: "#4A6FA5",
          light: "#6B8DC4",
          dark: "#2E4F80",
        },
        amber: {
          covenant: "#F59E0B",
          bg: "#FFFBEB",
          border: "#FCD34D",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 4px 24px rgba(27, 42, 74, 0.12)",
      },
    },
  },
  plugins: [],
};
