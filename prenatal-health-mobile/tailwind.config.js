/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'health-blue': '#00bfff',
        'health-green': '#7dd3fc',
        'health-accent': '#e11d48',
        'health-bg': '#f8fafc',
        'health-bg-dark': '#0f172a',
        primary: {
          DEFAULT: '#00bfff',
          foreground: '#f8fafc',
        },
        secondary: {
          DEFAULT: '#7dd3fc', 
          foreground: '#0f172a',
        },
        accent: {
          DEFAULT: '#e11d48',
          foreground: '#f8fafc',
        },
        background: '#f8fafc',
        foreground: '#0f172a',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#0f172a',
        },
        border: '#e2e8f0',
        muted: {
          DEFAULT: '#f1f5f9',
          foreground: '#64748b',
        },
      },
    },
  },
  plugins: [],
}
