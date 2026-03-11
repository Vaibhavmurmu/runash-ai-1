import React from "react";

export function SidebarSection({
  id,
  className,
  children,
}: {
  id: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <aside id={id} className={className} aria-label="Sidebar">
      {children}
    </aside>
  );
}
