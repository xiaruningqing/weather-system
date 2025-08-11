/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0ea5e9',
      },
      boxShadow: {
        glow: '0 0 20px rgba(14, 165, 233, 0.6)',
      },
    },
  },
  plugins: [],
}



