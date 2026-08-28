/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        riskgreen: '#16a34a',
        riskdark: '#061624',
        risksidebar: '#071827',
        riskbg: '#f5f7fb',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
      keyframes: {
      float: {
        '0%, 100%': { transform: 'translateY(0px)' },
        '50%': { transform: 'translateY(-12px)' },
      },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
