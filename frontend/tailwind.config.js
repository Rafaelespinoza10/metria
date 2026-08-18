/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#F08343',
          dark: '#D96A2B',
          soft: '#FBE7D8',
        },
        charcoal: {
          DEFAULT: '#1E1B16',
          soft: '#2A261F',
        },
        ink: {
          950: '#F2EDE5',
          900: '#FFFFFF',
          800: '#EDE6DC',
          700: '#E2DACE',
        },
        metric: {
          move: '#F08343',
          heart: '#E25C5C',
          sleep: '#7B6FE0',
          hydro: '#3BA7DC',
          protein: '#DB9E00',
        },
        content: {
          primary: '#1E1B16',
          secondary: '#6F675C',
          tertiary: '#A89F92',
        },
      },
    },
  },
  plugins: [],
};
