/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        hype: {
          50: "#fef2f4",
          100: "#ffe2e8",
          300: "#ff9ab0",
          500: "#f65f82",
          700: "#bf2f50",
          900: "#7a1530"
        }
      }
    }
  },
  plugins: []
};
