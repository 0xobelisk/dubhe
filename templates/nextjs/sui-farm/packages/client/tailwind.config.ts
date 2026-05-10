import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'farm-green': '#4a7c59',
        'farm-brown': '#8b5e3c',
        'farm-gold': '#d4a017',
        'farm-sky': '#87ceeb'
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace']
      }
    }
  },
  plugins: []
} satisfies Config;
