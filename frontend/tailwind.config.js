/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#38a9f8',
          500: '#0e8cf0',
          600: '#1877F2', // The exact vibrant blue from image
          700: '#055ecb',
          800: '#0a4ea4',
          900: '#0e4288',
        },
      },
      boxShadow: {
        'premium': '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.06), 0 8px 28px rgba(0,0,0,0.06)',
        'brand': '0 4px 14px rgba(24,119,242,0.35)',
        'brand-hover': '0 6px 20px rgba(24,119,242,0.45)',
      },

    },
  },
  plugins: [],
};
