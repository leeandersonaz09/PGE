/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // ✅ ESSA É A LINHA MÁGICA PARA O TEMA ESCURO
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
