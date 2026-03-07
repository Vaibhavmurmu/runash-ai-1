import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
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
        brand: {
          start: "hsl(var(--brand-start))",
          middle: "hsl(var(--brand-middle))",
          end: "hsl(var(--brand-end))",
          surface: "hsl(var(--brand-surface))",
          "surface-hover": "hsl(var(--brand-surface-hover))",
          border: "hsl(var(--brand-border))",
          ring: "hsl(var(--brand-ring))",
          foreground: "hsl(var(--brand-foreground))",
        },
        runash: {
          primary: "hsl(var(--runash-primary))",
          "primary-strong": "hsl(var(--runash-primary-strong))",
          "primary-soft": "hsl(var(--runash-primary-soft))",
          "gradient-start": "hsl(var(--runash-gradient-start))",
          "gradient-mid": "hsl(var(--runash-gradient-mid))",
          "gradient-end": "hsl(var(--runash-gradient-end))",
          "text-strong": "hsl(var(--runash-text-strong))",
          "text-muted": "hsl(var(--runash-text-muted))",
          "surface-1": "hsl(var(--runash-surface-1))",
          "surface-2": "hsl(var(--runash-surface-2))",
          "surface-3": "hsl(var(--runash-surface-3))",
          border: "hsl(var(--runash-border))",
          ring: "hsl(var(--runash-ring))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          surface: "hsl(var(--success-surface))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          surface: "hsl(var(--warning-surface))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
          surface: "hsl(var(--error-surface))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          surface: "hsl(var(--info-surface))",
        },
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(120deg, hsl(var(--brand-start)), hsl(var(--brand-middle)), hsl(var(--brand-end)))",
        "brand-gradient-soft":
          "linear-gradient(135deg, hsl(var(--brand-start) / 0.22), hsl(var(--brand-middle) / 0.16), hsl(var(--brand-end) / 0.1))",
        "runash-orange-gradient":
          "linear-gradient(120deg, hsl(var(--runash-gradient-start)), hsl(var(--runash-gradient-mid)), hsl(var(--runash-gradient-end)))",
        "runash-orange-gradient-soft":
          "linear-gradient(135deg, hsl(var(--runash-gradient-start) / 0.2), hsl(var(--runash-gradient-mid) / 0.14), hsl(var(--runash-gradient-end) / 0.08))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
