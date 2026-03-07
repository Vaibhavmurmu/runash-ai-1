import React from "react";

export function NavbarSection({ children }: { children: React.ReactNode }) {
  return (
    <header className="relative flex flex-col items-center gap-3 pb-1 md:min-h-[3.5rem] md:justify-center">
      {children}
    </header>
  );
}
