/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // RP-friendly dark palette
        bg: '#0b0b0f',
        surface: '#15151c',
        surface2: '#1e1e28',
        border: '#2a2a36',
        primary: '#7c5cff',
        muted: '#8b8b9a',
        user: '#1f2a44',
        char: '#241c33',
      },
    },
  },
  plugins: [],
};
