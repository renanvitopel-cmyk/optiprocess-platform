/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef2f8",
          100: "#d6e0ee",
          200: "#adc2dd",
          300: "#7d9cc4",
          400: "#4f74a3",
          500: "#335684",
          600: "#25406a",
          700: "#1c3153",
          800: "#13223c",
          900: "#0b1729",
          950: "#060d18",
        },
        graphite: {
          50: "#f4f5f6",
          100: "#e5e7ea",
          200: "#cbcfd5",
          300: "#a6adb7",
          400: "#7c8493",
          500: "#5f6674",
          600: "#4a505c",
          700: "#3b404a",
          800: "#2d3139",
          900: "#22252b",
          950: "#16181c",
        },
        safety: {
          yellow: "#F5B400",
          "yellow-dark": "#C99000",
          green: "#0F9D58",
          "green-dark": "#0B7A44",
          red: "#D93025",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(11 23 41 / 0.06), 0 1px 3px 0 rgb(11 23 41 / 0.08)",
      },
    },
  },
  plugins: [],
};
