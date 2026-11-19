/** @type {import('tailwindcss').Config} */
// CSS theme tokens remain the color owner; adapters preserve Tailwind opacity utilities.
const orange = 'rgb(var(--mva-brand-orange-rgb, 242 146 67) / <alpha-value>)';
const navy = 'rgb(var(--mva-brand-navy-rgb, 36 43 72) / <alpha-value>)';
const accent = {
  50: '#FEF4EC', 100: '#FCE9DA', 200: '#F8D3B4',
  300: orange, 400: orange, 500: orange, 600: orange,
  700: navy, 800: navy, 900: navy, 950: navy,
};
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F1F1F1', 100: '#F1F1F1', 200: '#BDBFC8', 300: '#9195A3',
          400: '#666B7F', 500: '#666B7F', 600: '#3A405A', 700: '#3A405A',
          800: '#3A405A', 900: navy, 950: navy,
        },
        mva: {
          blue: navy, dark: navy, card: '#3A405A',
          orange, orangeHover: orange, orangeLight: '#FEF4EC',
        },
        orange: accent,
        accent,
      },
      boxShadow: {
        sm: 'var(--mva-shadow-low)', DEFAULT: 'var(--mva-shadow-low)',
        md: 'var(--mva-shadow-raised)', lg: 'var(--mva-shadow-raised)',
        xl: 'var(--mva-shadow-overlay)', '2xl': 'var(--mva-shadow-overlay)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
