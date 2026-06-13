import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#0f172a', accent: '#38bdf8' },
        profit: '#22c55e',
        loss: '#ef4444',
      }
    }
  },
  plugins: []
}

export default config
