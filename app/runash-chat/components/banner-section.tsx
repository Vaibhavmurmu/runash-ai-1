import React from "react";

export function BannerSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl" role="status" aria-live="polite">
      {children}
    </div>
  );
}
