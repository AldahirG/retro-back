/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rr: { black: '#0d0d0d', red: '#c8382a', cream: '#f5f4ef' },
      },
    },
  },
  plugins: [],
}

