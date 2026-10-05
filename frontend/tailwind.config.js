/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gov: {
          navy: '#003366',
          'navy-dark': '#002244',
          'navy-light': '#0B3D91',
          saffron: '#FF9933',
          'saffron-dark': '#E67E22',
          bg: '#F5F7FA',
          card: '#FFFFFF',
          border: '#D1D5DB',
          'border-dark': '#9CA3AF',
          text: '#1F2937',
          'text-muted': '#4B5563',
          green: '#1B7A43',
          amber: '#B45309',
          red: '#B91C1C',
        }
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'],
        mono: ['"Consolas"', '"Courier New"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '3px',
        'sm': '2px',
        'md': '4px',
        'lg': '6px',
      }
    },
  },
  plugins: [],
}
