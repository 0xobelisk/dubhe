import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        night: '#1a1c2c',
        panel: '#29366f',
        grass: '#38b764',
        'grass-dark': '#257953',
        dirt: '#a77b5b',
        cream: '#f4f4f4',
        gold: '#ffcd75',
        accent: '#ef7d57',
        water: '#3b5dc9'
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace']
      }
    }
  },
  plugins: []
} satisfies Config;
