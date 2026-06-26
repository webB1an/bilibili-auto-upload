/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0B0F17',
        surface: '#121826',
        surface2: '#1A2233',
        accent: '#2DD4BF',
        accentDim: '#1E9E8A',
        warn: '#F59E0B',
        danger: '#F87171'
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 40px rgba(45, 212, 191, 0.15)',
        card: '0 8px 32px rgba(0, 0, 0, 0.35)'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
}
