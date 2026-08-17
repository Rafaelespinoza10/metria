/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#10B981',
          dark: '#047857',
          soft: 'rgba(16,185,129,0.14)',
        },
        ink: {
          950: '#0A0F0D',
          900: '#111815',
          800: '#1A2420',
          700: '#27332E',
        },
        metric: {
          move: '#F97316',
          heart: '#F43F5E',
          sleep: '#818CF8',
          hydro: '#38BDF8',
          protein: '#FACC15',
        },
        content: {
          primary: '#F4F7F5',
          secondary: '#9BA8A1',
          tertiary: '#5C6B64',
        },
      },
    },
  },
  plugins: [],
};
