/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#E11D48",
        secondary: "#FB7185",
        cta: "#2563EB",
        background: "#FFF1F2",
        text: "#881337",
        hype: {
          50: "#fef2f4",
          100: "#ffe2e8",
          300: "#ff9ab0",
          500: "#f65f82",
          700: "#bf2f50",
          900: "#7a1530"
        }
      },
      fontFamily: {
        heading: ["System"], 
      }
    }
  },
  plugins: []
};
