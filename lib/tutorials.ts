export type TutorialCategory = "getting-started" | "ai-features" | "streaming" | "advanced"
export type TutorialTab = "all" | TutorialCategory

export type Tutorial = {
  title: string
  description: string
  duration: string
  difficulty: string
  author: string
  thumbnail: string
  category: TutorialCategory
  featured?: boolean
}

const CATEGORY_LABELS: Record<TutorialCategory, string> = {
  "getting-started": "Getting Started",
  "ai-features": "AI Features",
  streaming: "Streaming",
  advanced: "Advanced",
}

export const TUTORIALS: Tutorial[] = [
  {
    title: "Complete RunAsh AI Setup Guide",
    description:
      "Learn how to set up RunAsh AI from scratch, connect your streaming platforms, and configure your first AI-enhanced stream in under 15 minutes.",
    duration: "15 min",
    difficulty: "Beginner",
    author: "Sarah Johnson",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "getting-started",
    featured: true,
  },
  {
    title: "Your First AI-Enhanced Stream",
    description: "Step-by-step guide to creating your first stream with AI enhancements.",
    duration: "10 min",
    difficulty: "Beginner",
    author: "Alex Chen",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "getting-started",
  },
  {
    title: "AI Video Enhancement Basics",
    description: "Learn how to use RunAsh's AI video enhancement to automatically improve your stream quality.",
    duration: "8 min",
    difficulty: "Beginner",
    author: "Alex Chen",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "ai-features",
  },
  {
    title: "Custom Virtual Backgrounds",
    description: "Create and use custom virtual backgrounds without a green screen using AI.",
    duration: "6 min",
    difficulty: "Beginner",
    author: "Emma Wilson",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "ai-features",
  },
  {
    title: "Multi-Platform Streaming Setup",
    description: "Configure streaming to multiple platforms simultaneously with platform-specific optimizations.",
    duration: "12 min",
    difficulty: "Intermediate",
    author: "Michael Rodriguez",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "streaming",
  },
  {
    title: "Advanced Chat Moderation",
    description: "Set up AI-powered chat moderation with custom rules and automated responses.",
    duration: "10 min",
    difficulty: "Advanced",
    author: "David Kim",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "advanced",
  },
  {
    title: "Stream Analytics Deep Dive",
    description: "Understand your audience with RunAsh's comprehensive analytics dashboard.",
    duration: "14 min",
    difficulty: "Intermediate",
    author: "Priya Patel",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "advanced",
  },
  {
    title: "API Integration Guide",
    description: "Integrate RunAsh AI with your existing tools using our comprehensive API.",
    duration: "20 min",
    difficulty: "Advanced",
    author: "Tech Team",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "advanced",
  },
]

export const getCategoryLabel = (category: string) => CATEGORY_LABELS[category as TutorialCategory] ?? "Tutorial"

export const getFeaturedTutorial = () => TUTORIALS.find((tutorial) => tutorial.featured)

export const getTutorialsByCategory = (category: TutorialCategory) =>
  TUTORIALS.filter((tutorial) => tutorial.category === category)

export const getVisibleTutorials = ({ tab, searchQuery }: { tab: TutorialTab; searchQuery: string }) => {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  return TUTORIALS.filter((tutorial) => {
    const matchesTab = tab === "all" ? true : tutorial.category === tab
    const matchesSearch =
      normalizedQuery.length === 0
        ? true
        : [tutorial.title, tutorial.description, tutorial.author, getCategoryLabel(tutorial.category)]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)

    return matchesTab && matchesSearch
  })
}
