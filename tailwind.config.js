/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "rgba(255, 255, 255, 0.08)",
        input: "rgba(255, 255, 255, 0.06)",
        ring: "#4F8CFF",
        background: "#08090B",
        foreground: "#F3F4F6",
        primary: {
          DEFAULT: "#4F8CFF",
          foreground: "#08090B",
        },
        secondary: {
          DEFAULT: "#101216",
          foreground: "#F3F4F6",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#101216",
          foreground: "#94A3B8",
        },
        accent: {
          DEFAULT: "#14171C",
          foreground: "#F3F4F6",
        },
        popover: {
          DEFAULT: "#14171C",
          foreground: "#F3F4F6",
        },
        card: {
          DEFAULT: "#14171C",
          foreground: "#F3F4F6",
        },
        zinc: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          405: '#A1A1AA',
          450: '#71717A',
          500: '#71717A',
          505: '#52525B',
          550: '#3F3F46',
          600: '#52525B',
          650: '#27272A',
          700: '#3F3F46',
          800: '#14171C', // Card background color
          850: '#14171C', // Card background color
          900: '#101216', // Secondary background color
          950: '#08090B', // Primary background color
        },
        emerald: {
          450: '#10B981', // Success color
          500: '#10B981',
          955: '#064E3B',
        },
        rose: {
          450: '#EF4444', // Error color
          455: '#FCA5A5',
          500: '#EF4444',
          955: '#7F1D1D',
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
