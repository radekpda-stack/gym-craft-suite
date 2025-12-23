import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Unified Status Colors
        "status-ok": "hsl(var(--status-ok))",
        "status-warning": "hsl(var(--status-warning))",
        "status-error": "hsl(var(--status-error))",
        // Neon accent
        "accent-neon": {
          DEFAULT: "hsl(var(--accent-neon))",
          foreground: "hsl(var(--accent-neon-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      boxShadow: {
        'sharp': '0 4px 0 hsl(0 0% 0% / 0.4)',
        'sharp-sm': '0 2px 0 hsl(0 0% 0% / 0.4)',
        'glow': '0 0 60px hsl(68 100% 50% / 0.4)',
        'glow-sm': '0 0 20px hsl(68 100% 50% / 0.3)',
        'inset': 'inset 0 2px 4px hsl(0 0% 0% / 0.4)',
        'brutal': '4px 4px 0 hsl(0 0% 0% / 0.5)',
        'brutal-sm': '2px 2px 0 hsl(0 0% 0% / 0.5)',
        'volt': '0 0 30px hsl(68 100% 50% / 0.35)',
        'volt-lg': '0 0 50px hsl(68 100% 50% / 0.45)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "body-pulse": {
          "0%, 100%": { 
            opacity: "1",
            transform: "scale(1)"
          },
          "50%": { 
            opacity: "0.6",
            transform: "scale(1.05)"
          },
        },
        "stagger-fade": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up-fade": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "sharp-in": {
          "0%": { opacity: "0", transform: "translateY(-8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "sharp-slide": {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(68 100% 50% / 0.25)" },
          "50%": { boxShadow: "0 0 40px hsl(68 100% 50% / 0.5)" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "hsl(68 100% 50% / 0.3)" },
          "50%": { borderColor: "hsl(68 100% 50% / 0.6)" },
        },
        "volt-pulse": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 20px hsl(68 100% 50% / 0.3)" },
          "50%": { opacity: "0.9", boxShadow: "0 0 35px hsl(68 100% 50% / 0.5)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.15s ease-out",
        "accordion-up": "accordion-up 0.15s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "body-pulse": "body-pulse 1.5s ease-in-out infinite",
        "stagger-fade": "stagger-fade 0.2s ease-out",
        "slide-up-fade": "slide-up-fade 0.25s ease-out",
        "sharp-in": "sharp-in 0.2s ease-out",
        "sharp-slide": "sharp-slide 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",
        "volt-pulse": "volt-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
