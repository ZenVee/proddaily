/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        proddaily: {
          bg: '#101010',
          'bg-2': '#181818',
          card: '#222222',
          'card-2': '#2A2A2A',
          accent: '#D4B896',
          'accent-2': '#BFA582',
          text: '#F5F3EF',
          'text-2': '#999999',
          border: '#383838',
        },
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        serif: ['"Barlow Condensed"', 'Impact', 'sans-serif'],
        sans: ['Barlow', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        street: '2px',
      },
    },
  },
  plugins: [],
};
