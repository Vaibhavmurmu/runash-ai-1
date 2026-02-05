"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { defaultBrand, type BrandConfig, toCssVars } from "@/lib/branding"

type BrandContextValue = {
  brand: BrandConfig
  setBrand: (cfg: Partial<BrandConfig>) => void
}

const BrandContext = createContext<BrandContextValue>({
  brand: defaultBrand,
  setBrand: () => {},
})

export function BrandProvider({
  children,
  initialBrand,
}: { children: React.ReactNode; initialBrand?: Partial<BrandConfig> }) {
  const [brand, setBrandState] = useState<BrandConfig>({ ...defaultBrand, ...initialBrand })

  // Apply CSS variables for branding
  useEffect(() => {
    const vars = toCssVars(brand)
    Object.entries(vars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v)
    })
  }, [brand])

  const setBrand = useCallback(
    (cfg: Partial<BrandConfig>) => {
      setBrandState((b) => ({ ...b, ...cfg }))
      try {
        localStorage.setItem("runash:brand", JSON.stringify({ ...brand, ...cfg }))
      } catch {}
    },
    [brand],
  )

  // Load saved brand on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("runash:brand")
      if (raw) {
        const saved = JSON.parse(raw) as BrandConfig
        setBrandState(saved)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<BrandContextValue>(() => ({ brand, setBrand }), [brand, setBrand])

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}

export function useBrand() {
  return useContext(BrandContext)
}
