/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#060a10',
        surface: '#0c1420',
        border:  '#182035',
        accent:  '#3d9bff',
        teal:    '#00e5cc',
        orange:  '#ff6b35',
        muted:   '#48587a',
        text:    '#c4d0ec',
        hl:      '#eef2ff',
      },
    },
  },
  plugins: [],
};
