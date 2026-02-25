import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },
      fontFamily: {
        trading: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        blue: {
          400: '#2589FE',
          500: '#0070F3',
          600: '#2F6FEB',
        },
        // 트레이딩 터미널 전용 색상
        terminal: {
          bg: '#121212',
          card: '#1E1E1E',
          'card-hover': '#252525',
          border: 'rgba(255,255,255,0.08)',
          'border-light': 'rgba(255,255,255,0.12)',
        },
        trading: {
          green: '#00FF87',
          red: '#FF4444',
          'green-dim': '#00CC6A',
          'red-dim': '#CC3333',
          blue: '#4A9EFF',
          yellow: '#FFD700',
        },
      },
      animation: {
        flash: 'flash 300ms ease-out',
        'ticker-scroll': 'ticker-scroll 30s linear infinite',
      },
    },
    keyframes: {
      shimmer: {
        '100%': {
          transform: 'translateX(100%)',
        },
      },
      flash: {
        '0%': { backgroundColor: 'rgba(255, 215, 0, 0.3)' },
        '100%': { backgroundColor: 'transparent' },
      },
      'ticker-scroll': {
        '0%': { transform: 'translateX(0)' },
        '100%': { transform: 'translateX(-50%)' },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
export default config;
