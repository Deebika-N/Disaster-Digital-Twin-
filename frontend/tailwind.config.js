/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          950: '#030E12',
          900: '#06171B',
          850: '#091F24',
          800: '#0E2930',
          750: '#13353E',
          700: '#18424D',
          600: '#215664',
          500: '#2F7587',
        },
        teal: {
          accent: '#00E5C9',
          glow: 'rgba(0, 229, 201, 0.15)',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
        },
        emergency: {
          red: '#EF4444',
          amber: '#F59E0B',
          blue: '#3B82F6',
          purple: '#8B5CF6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-teal': '0 0 20px -3px rgba(0, 229, 201, 0.25)',
        'glow-subtle': '0 0 15px -3px rgba(20, 184, 166, 0.15)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}
