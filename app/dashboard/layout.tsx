import type React from "react";
import type { Metadata } from "next";
import { DashboardFooter } from "@/components/dashboard/dashboard-shell-footer";
import { DashboardLayoutFrame } from "@/components/dashboard/dashboard-layout-frame";

export const metadata: Metadata = {
  title: {
    default: "Dashboard | RunAsh AI",
    template: "%s | RunAsh AI Dashboard",
  },
  description:
    "RunAsh AI dashboard for workspace control, analytics insights, automation workflows, and AI agent operations.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayoutFrame
      footer={<DashboardFooter />}
      contentClassName="mx-auto flex w-full flex-1 justify-center p-4 md:p-6"
      contentCollapsedClassName="mx-auto flex w-full max-w-[1200px] flex-1 justify-center p-4 md:p-6"
    >
      {children}
    </DashboardLayoutFrame>
  );
}
