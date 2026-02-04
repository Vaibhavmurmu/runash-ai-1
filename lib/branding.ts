export type BrandConfig = {
  name: string
  primary: string
  secondary: string
  accent: string
  logoUrl: string
  markUrl?: string
}

export const defaultBrand: BrandConfig = {
  name: "RunAsh AI",
  primary: "#16a34a", // emerald-600
  secondary: "#334155", // slate-700
  accent: "#a3e635", // lime-400
  logoUrl: "/placeholder-logo.svg",
  markUrl: "/placeholder-logo.png",
}

export function toCssVars(cfg: BrandConfig) {
  return {
    "--ra-brand-primary": cfg.primary,
    "--ra-brand-secondary": cfg.secondary,
    "--ra-brand-accent": cfg.accent,
  } as Record<string, string>
}
