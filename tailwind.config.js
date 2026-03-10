/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: '#0e1556',
        accent: {
          DEFAULT: '#38b6ff',
          hover: '#2da1e6',
        },
        citrus: {
          DEFAULT: '#ff6500',
          hover: '#e65a00',
        },
        neutral: {
          bg: '#f6f7fb',
          dark: '#0b0f1f',
          light: '#52586b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px rgba(14, 21, 86, 0.04)',
        'soft-md': '0 8px 24px rgba(14, 21, 86, 0.06)',
        'soft-lg': '0 16px 48px rgba(14, 21, 86, 0.08)',
        'soft-xl': '0 24px 64px rgba(14, 21, 86, 0.12)',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    },
  },
  plugins: [],
}
