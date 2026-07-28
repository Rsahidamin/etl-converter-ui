/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'cyber-dark': '#0a0c10', 
        'cyber-panel': '#161b22',
        'cyber-blue': '#00f0ff',
        'cyber-purple': '#b026ff',
      },
    },
  },
  plugins: [],
}
