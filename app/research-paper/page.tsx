import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Research Papers | RunAsh",
  description: "Read RunAsh AI papers, implementation briefs, and reproducible notebook resources.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Publications"
      title="Research Papers"
      intro="A practical library of RunAsh research papers, technical summaries, and implementation-ready notes for builders."
      sections={[
        {
          title: "Applied AI Papers",
          description: "Peer-oriented writeups covering real-time inference, multimodal learning, and streaming AI optimizations.",
        },
        {
          title: "Reproducible Notebooks",
          description: "Companion experiments prepared for Google Colab and Kaggle to make benchmarking and review easier.",
        },
        {
          title: "Model & Dataset Notes",
          description: "Implementation details and release notes linked to Hugging Face model cards and evaluation logs.",
        },
      ]}
      ctaLabel="Open AI research lab"
      ctaHref="/ai-research-lab"
    />
  )
}
