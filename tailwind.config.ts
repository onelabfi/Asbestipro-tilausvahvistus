import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1a1a2e',
          blue: '#0066cc',
          green: '#00a651',
        },
      },
    },
  },
  plugins: [],
};

export default config;
