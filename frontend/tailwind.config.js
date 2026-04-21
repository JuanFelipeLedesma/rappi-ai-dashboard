/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        rappi: {
          DEFAULT: "#FF441F",
          light: "#FF6B4A",
          dark: "#CC3519",
        },
        ink: {
          900: "#0B0E14",
          800: "#121621",
          700: "#1C2230",
          600: "#2A3142",
          500: "#3A4256",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto"],
      },
    },
  },
  plugins: [],
};
