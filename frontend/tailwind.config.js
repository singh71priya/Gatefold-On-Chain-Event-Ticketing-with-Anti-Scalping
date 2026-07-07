/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F1E4',
        stub: '#EFE7D2',
        ink: '#1F2A24',
        line: '#D8CDAE',
        accent: {
          DEFAULT: '#C4622D',
          soft: '#F0DCC9',
        },
        stamp: '#2F5D4E',
        danger: '#B4402C',
      },
      fontFamily: {
        display: ['"Bebas Neue"', '"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        stub: '0.5rem',
      },
    },
  },
  plugins: [],
};
