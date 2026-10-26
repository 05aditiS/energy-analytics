/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0D13',       // Matte Obsidian
          card: '#131620',     // Deep Bento Card Dark
          cardHover: '#181D2A',
          border: 'rgba(255, 255, 255, 0.08)',
          muted: '#8A92A6',
        },
        light: {
          bg: '#F4F7FC',       // Crisp Soft Slate
          card: '#FFFFFF',     // Pure White Bento Card
          cardHover: '#FAFCFF',
          border: '#E2E8F0',   // Slate 200
          muted: '#64748B',
        },
        brand: {
          blue: '#2563EB',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          sky: '#0EA5E9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'bento-light': '0 1px 3px rgba(0, 0, 0, 0.03), 0 6px 24px -4px rgba(15, 23, 42, 0.05)',
        'bento-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'glow-blue': '0 0 25px -5px rgba(37, 99, 235, 0.3)',
      }
    },
  },
  plugins: [],
}
