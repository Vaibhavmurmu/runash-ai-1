import type { Metadata } from "next"

type DashboardMetadataInput = {
  title: string
  description: string
  path: string
}

export function createDashboardMetadata({ title, description, path }: DashboardMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${title} | RunAsh AI Dashboard`,
      description,
      url: path,
      type: "website",
    },
  }
}
