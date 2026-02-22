"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  Download,
  Search,
  Filter,
  Grid,
  List,
  Star,
  Clock,
  FileText,
  Video,
  Headphones,
  ImageIcon,
  Presentation,
  BookOpen,
  Heart,
  Share2,
  Eye,
  ChevronDown,
  WifiOff,
  HardDrive,
  Calendar,
  Globe,
  Crown,
  CheckCircle,
  FolderPlus,
  BookmarkPlus,
} from "lucide-react"
import type { DownloadableResource, ResourceSearchFilters, ResourceCategory } from "@/types/downloadable-resources"

// Sample data for downloadable resources
const sampleCategories: ResourceCategory[] = [
  {
    id: "soil-health",
    name: "Soil Health",
    description: "Comprehensive guides on soil testing, improvement, and management",
    icon: "🌱",
    color: "bg-green-100 text-green-800",
    resourceCount: 45,
    popularTags: ["pH testing", "composting", "soil structure", "nutrients"],
    featuredResources: ["soil-testing-guide", "composting-handbook"],
    subcategories: [
      {
        id: "soil-testing",
        name: "Soil Testing",
        description: "Testing methods and interpretation",
        resourceCount: 12,
        icon: "🧪",
      },
      {
        id: "soil-improvement",
        name: "Soil Improvement",
        description: "Techniques for enhancing soil quality",
        resourceCount: 18,
        icon: "⬆️",
      },
      {
        id: "composting",
        name: "Composting",
        description: "Organic matter decomposition",
        resourceCount: 15,
        icon: "♻️",
      },
    ],
  },
  {
    id: "pest-management",
    name: "Pest Management",
    description: "Integrated pest management strategies and organic solutions",
    icon: "🐛",
    color: "bg-red-100 text-red-800",
    resourceCount: 38,
    popularTags: ["IPM", "beneficial insects", "organic pesticides", "monitoring"],
    featuredResources: ["ipm-guide", "beneficial-insects-handbook"],
    subcategories: [
      {
        id: "identification",
        name: "Pest Identification",
        description: "Identifying common pests",
        resourceCount: 15,
        icon: "🔍",
      },
      {
        id: "biological-control",
        name: "Biological Control",
        description: "Using natural predators",
        resourceCount: 12,
        icon: "🦋",
      },
      {
        id: "organic-treatments",
        name: "Organic Treatments",
        description: "Natural pest control methods",
        resourceCount: 11,
        icon: "🌿",
      },
    ],
  },
  {
    id: "water-management",
    name: "Water Management",
    description: "Efficient irrigation and water conservation techniques",
    icon: "💧",
    color: "bg-blue-100 text-blue-800",
    resourceCount: 32,
    popularTags: ["drip irrigation", "water conservation", "rainwater harvesting"],
    featuredResources: ["irrigation-guide", "water-conservation-manual"],
    subcategories: [
      {
        id: "irrigation",
        name: "Irrigation Systems",
        description: "Different irrigation methods",
        resourceCount: 18,
        icon: "🚿",
      },
      {
        id: "conservation",
        name: "Water Conservation",
        description: "Saving and reusing water",
        resourceCount: 14,
        icon: "💧",
      },
    ],
  },
  {
    id: "crop-management",
    name: "Crop Management",
    description: "Planting, growing, and harvesting organic crops",
    icon: "🌾",
    color: "bg-yellow-100 text-yellow-800",
    resourceCount: 56,
    popularTags: ["crop rotation", "companion planting", "harvest timing"],
    featuredResources: ["crop-rotation-guide", "companion-planting-chart"],
    subcategories: [
      {
        id: "planning",
        name: "Crop Planning",
        description: "Planning crop rotations and layouts",
        resourceCount: 20,
        icon: "📋",
      },
      {
        id: "cultivation",
        name: "Cultivation",
        description: "Growing and maintaining crops",
        resourceCount: 25,
        icon: "🌱",
      },
      {
        id: "harvesting",
        name: "Harvesting",
        description: "Optimal harvest timing and methods",
        resourceCount: 11,
        icon: "🌾",
      },
    ],
  },
]

const sampleResources: DownloadableResource[] = [
  {
    id: "soil-testing-guide",
    title: "Complete Soil Testing Guide",
    description:
      "Comprehensive guide covering all aspects of soil testing, from basic pH tests to advanced nutrient analysis. Includes step-by-step procedures, equipment recommendations, and interpretation guidelines.",
    category: "soil-health",
    subcategory: "soil-testing",
    type: "pdf",
    format: "PDF",
    fileSize: 15728640, // 15 MB
    pages: 120,
    language: "English",
    difficulty: "intermediate",
    tags: ["soil testing", "pH", "nutrients", "laboratory", "field testing"],
    author: {
      id: "dr-sarah-johnson",
      name: "Dr. Sarah Johnson",
      title: "Soil Scientist",
      organization: "Agricultural Research Institute",
      bio: "Leading soil scientist with 15+ years of experience in soil health research",
      avatar: "/placeholder.svg?height=40&width=40",
      expertise: ["Soil Chemistry", "Nutrient Management", "Soil Biology"],
      credentials: ["PhD Soil Science", "Certified Soil Scientist"],
      socialLinks: [],
      verificationStatus: "verified",
    },
    publisher: "Organic Farming Institute",
    publishedDate: new Date("2024-01-15"),
    lastUpdated: new Date("2024-01-20"),
    version: "2.1",
    downloadUrl: "/downloads/soil-testing-guide.pdf",
    thumbnailUrl: "/placeholder.svg?height=200&width=150",
    previewUrl: "/previews/soil-testing-guide-preview.pdf",
    price: 0,
    isPremium: false,
    isOfflineAvailable: true,
    downloadCount: 1247,
    rating: 4.8,
    reviewCount: 89,
    fileHash: "sha256:abc123...",
    requirements: ["Basic chemistry knowledge"],
    relatedResources: ["composting-handbook", "nutrient-management-guide"],
    certificationCredit: 3,
    isInteractive: false,
    hasQuiz: true,
    hasWorksheet: true,
    accessLevel: "free",
    licenseType: "educational",
    metadata: {
      keywords: ["soil", "testing", "pH", "nutrients", "analysis"],
      topics: ["Soil Chemistry", "Laboratory Procedures", "Field Testing"],
      learningObjectives: [
        "Understand different soil testing methods",
        "Interpret soil test results",
        "Choose appropriate testing equipment",
      ],
      prerequisites: ["Basic understanding of soil composition"],
      targetAudience: ["Farmers", "Agricultural Students", "Extension Agents"],
      practicalApplications: ["Farm soil assessment", "Fertilizer planning", "Crop selection"],
      tools: ["pH meter", "Soil auger", "Test kits"],
      techniques: ["Soil sampling", "Laboratory analysis", "Field testing"],
      regions: ["Temperate", "Subtropical", "Tropical"],
      seasons: ["All seasons"],
      crops: ["All crops"],
      equipment: ["pH meter", "Soil thermometer", "Sample containers"],
    },
  },
  {
    id: "composting-video-series",
    title: "Advanced Composting Techniques Video Series",
    description:
      "Professional video series covering advanced composting methods including hot composting, vermicomposting, and bokashi fermentation. Features real farm demonstrations and expert interviews.",
    category: "soil-health",
    subcategory: "composting",
    type: "video",
    format: "MP4",
    fileSize: 524288000, // 500 MB
    duration: 7200, // 2 hours
    language: "English",
    difficulty: "advanced",
    tags: ["composting", "vermicomposting", "bokashi", "organic matter", "decomposition"],
    author: {
      id: "maria-rodriguez",
      name: "Maria Rodriguez",
      title: "Composting Specialist",
      organization: "Sustainable Agriculture Center",
      bio: "Expert in organic waste management and composting systems",
      avatar: "/placeholder.svg?height=40&width=40",
      expertise: ["Composting", "Waste Management", "Soil Biology"],
      credentials: ["MSc Environmental Science", "Certified Composter"],
      socialLinks: [],
      verificationStatus: "expert",
    },
    publishedDate: new Date("2024-01-10"),
    lastUpdated: new Date("2024-01-10"),
    version: "1.0",
    downloadUrl: "/downloads/composting-video-series.mp4",
    thumbnailUrl: "/placeholder.svg?height=200&width=300",
    price: 29.99,
    isPremium: true,
    isOfflineAvailable: true,
    downloadCount: 456,
    rating: 4.9,
    reviewCount: 34,
    fileHash: "sha256:def456...",
    requirements: ["Video player", "Basic composting knowledge"],
    relatedResources: ["soil-testing-guide", "organic-matter-handbook"],
    certificationCredit: 5,
    isInteractive: true,
    hasQuiz: true,
    hasWorksheet: false,
    accessLevel: "premium",
    licenseType: "personal",
    metadata: {
      keywords: ["composting", "organic", "decomposition", "microorganisms"],
      topics: ["Hot Composting", "Vermicomposting", "Bokashi", "Troubleshooting"],
      learningObjectives: [
        "Master advanced composting techniques",
        "Troubleshoot composting problems",
        "Optimize decomposition processes",
      ],
      prerequisites: ["Basic composting experience"],
      targetAudience: ["Experienced Farmers", "Composting Professionals"],
      practicalApplications: ["Large-scale composting", "Problem solving", "System optimization"],
      tools: ["Thermometer", "pH strips", "Turning tools"],
      techniques: ["Hot composting", "Vermicomposting", "Bokashi fermentation"],
      regions: ["All regions"],
      seasons: ["All seasons"],
      crops: ["All crops"],
      equipment: ["Compost bins", "Thermometer", "Turning equipment"],
    },
  },
  {
    id: "ipm-handbook",
    title: "Integrated Pest Management Handbook",
    description:
      "Comprehensive handbook for implementing IPM strategies in organic farming. Covers pest identification, monitoring techniques, biological controls, and organic treatment options.",
    category: "pest-management",
    subcategory: "biological-control",
    type: "ebook",
    format: "EPUB",
    fileSize: 8388608, // 8 MB
    pages: 200,
    language: "English",
    difficulty: "intermediate",
    tags: ["IPM", "pest control", "biological control", "monitoring", "organic"],
    author: {
      id: "dr-michael-chen",
      name: "Dr. Michael Chen",
      title: "Entomologist",
      organization: "University of Agricultural Sciences",
      bio: "Renowned entomologist specializing in sustainable pest management",
      avatar: "/placeholder.svg?height=40&width=40",
      expertise: ["Entomology", "IPM", "Biological Control"],
      credentials: ["PhD Entomology", "IPM Specialist Certification"],
      socialLinks: [],
      verificationStatus: "verified",
    },
    publishedDate: new Date("2024-01-05"),
    lastUpdated: new Date("2024-01-15"),
    version: "3.2",
    downloadUrl: "/downloads/ipm-handbook.epub",
    thumbnailUrl: "/placeholder.svg?height=200&width=150",
    price: 19.99,
    isPremium: true,
    isOfflineAvailable: true,
    downloadCount: 789,
    rating: 4.7,
    reviewCount: 67,
    fileHash: "sha256:ghi789...",
    requirements: ["EPUB reader"],
    relatedResources: ["beneficial-insects-guide", "organic-pesticides-manual"],
    certificationCredit: 4,
    isInteractive: false,
    hasQuiz: true,
    hasWorksheet: true,
    accessLevel: "premium",
    licenseType: "educational",
    metadata: {
      keywords: ["IPM", "pest", "management", "biological", "control"],
      topics: ["Pest Identification", "Monitoring", "Biological Control", "Treatment Thresholds"],
      learningObjectives: [
        "Implement effective IPM programs",
        "Identify beneficial and harmful insects",
        "Use monitoring tools effectively",
      ],
      prerequisites: ["Basic entomology knowledge"],
      targetAudience: ["Farmers", "Agricultural Consultants", "Extension Agents"],
      practicalApplications: ["Pest monitoring", "Treatment decisions", "Beneficial insect conservation"],
      tools: ["Magnifying glass", "Sticky traps", "Pheromone traps"],
      techniques: ["Visual inspection", "Trap monitoring", "Beneficial release"],
      regions: ["Temperate", "Mediterranean", "Subtropical"],
      seasons: ["Growing season"],
      crops: ["Vegetables", "Fruits", "Field crops"],
      equipment: ["Monitoring traps", "Magnification tools", "Recording sheets"],
    },
  },
]

export default function DownloadableResources() {
  const [searchFilters, setSearchFilters] = useState<ResourceSearchFilters>({
    query: "",
    categories: [],
    subcategories: [],
    types: [],
    formats: [],
    difficulties: [],
    languages: [],
    tags: [],
    authors: [],
    priceRange: [0, 100],
    fileSizeRange: [0, 1000],
    rating: 0,
    sortBy: "relevance",
    sortOrder: "desc",
  })

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [filteredResources, setFilteredResources] = useState(sampleResources)

  useEffect(() => {
    // Filter resources based on search criteria
    let filtered = sampleResources

    if (searchFilters.query) {
      filtered = filtered.filter(
        (resource) =>
          resource.title.toLowerCase().includes(searchFilters.query!.toLowerCase()) ||
          resource.description.toLowerCase().includes(searchFilters.query!.toLowerCase()) ||
          resource.tags.some((tag) => tag.toLowerCase().includes(searchFilters.query!.toLowerCase())),
      )
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((resource) => resource.category === selectedCategory)
    }

    if (searchFilters.difficulties.length > 0) {
      filtered = filtered.filter((resource) => searchFilters.difficulties.includes(resource.difficulty))
    }

    if (searchFilters.types.length > 0) {
      filtered = filtered.filter((resource) => searchFilters.types.includes(resource.type))
    }

    if (searchFilters.isPremium !== undefined) {
      filtered = filtered.filter((resource) => resource.isPremium === searchFilters.isPremium)
    }

    if (searchFilters.rating > 0) {
      filtered = filtered.filter((resource) => resource.rating >= searchFilters.rating)
    }

    // Sort resources
    filtered.sort((a, b) => {
      switch (searchFilters.sortBy) {
        case "title":
          return searchFilters.sortOrder === "asc" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
        case "rating":
          return searchFilters.sortOrder === "asc" ? a.rating - b.rating : b.rating - a.rating
        case "popularity":
          return searchFilters.sortOrder === "asc"
            ? a.downloadCount - b.downloadCount
            : b.downloadCount - a.downloadCount
        case "newest":
          return searchFilters.sortOrder === "asc"
            ? a.publishedDate.getTime() - b.publishedDate.getTime()
            : b.publishedDate.getTime() - a.publishedDate.getTime()
        case "fileSize":
          return searchFilters.sortOrder === "asc" ? a.fileSize - b.fileSize : b.fileSize - a.fileSize
        default:
          return 0
      }
    })

    setFilteredResources(filtered)
  }, [searchFilters, selectedCategory])

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
      case "document":
        return <FileText className="h-5 w-5" />
      case "video":
        return <Video className="h-5 w-5" />
      case "audio":
        return <Headphones className="h-5 w-5" />
      case "image":
        return <ImageIcon className="h-5 w-5" />
      case "presentation":
        return <Presentation className="h-5 w-5" />
      case "ebook":
        return <BookOpen className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800"
      case "intermediate":
        return "bg-yellow-100 text-yellow-800"
      case "advanced":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Downloadable Resources</h1>
        <p className="text-gray-600">Access comprehensive educational materials for offline learning and reference</p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search resources, topics, or authors..."
                value={searchFilters.query}
                onChange={(e) => setSearchFilters({ ...searchFilters, query: e.target.value })}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {sampleCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Options */}
            <Select
              value={searchFilters.sortBy}
              onValueChange={(value) => setSearchFilters({ ...searchFilters, sortBy: value as any })}
            >
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="popularity">Most Downloaded</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="fileSize">File Size</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Advanced Filters Toggle */}
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Difficulty Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty Level</label>
                  <div className="space-y-2">
                    {["beginner", "intermediate", "advanced"].map((difficulty) => (
                      <div key={difficulty} className="flex items-center space-x-2">
                        <Checkbox
                          id={difficulty}
                          checked={searchFilters.difficulties.includes(difficulty)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSearchFilters({
                                ...searchFilters,
                                difficulties: [...searchFilters.difficulties, difficulty],
                              })
                            } else {
                              setSearchFilters({
                                ...searchFilters,
                                difficulties: searchFilters.difficulties.filter((d) => d !== difficulty),
                              })
                            }
                          }}
                        />
                        <label htmlFor={difficulty} className="text-sm capitalize">
                          {difficulty}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resource Type Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Resource Type</label>
                  <div className="space-y-2">
                    {["pdf", "video", "audio", "ebook", "presentation"].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={searchFilters.types.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSearchFilters({
                                ...searchFilters,
                                types: [...searchFilters.types, type],
                              })
                            } else {
                              setSearchFilters({
                                ...searchFilters,
                                types: searchFilters.types.filter((t) => t !== type),
                              })
                            }
                          }}
                        />
                        <label htmlFor={type} className="text-sm capitalize flex items-center gap-2">
                          {getFileIcon(type)}
                          {type === "pdf" ? "PDF" : type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Access Level Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Access Level</label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="free"
                        checked={searchFilters.isPremium === false}
                        onCheckedChange={(checked) => {
                          setSearchFilters({
                            ...searchFilters,
                            isPremium: checked ? false : undefined,
                          })
                        }}
                      />
                      <label htmlFor="free" className="text-sm flex items-center gap-2">
                        <Globe className="h-4 w-4 text-green-600" />
                        Free Resources
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="premium"
                        checked={searchFilters.isPremium === true}
                        onCheckedChange={(checked) => {
                          setSearchFilters({
                            ...searchFilters,
                            isPremium: checked ? true : undefined,
                          })
                        }}
                      />
                      <label htmlFor="premium" className="text-sm flex items-center gap-2">
                        <Crown className="h-4 w-4 text-yellow-600" />
                        Premium Resources
                      </label>
                    </div>
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Minimum Rating</label>
                  <Select
                    value={searchFilters.rating.toString()}
                    onValueChange={(value) => setSearchFilters({ ...searchFilters, rating: Number.parseFloat(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any Rating</SelectItem>
                      <SelectItem value="3">3+ Stars</SelectItem>
                      <SelectItem value="4">4+ Stars</SelectItem>
                      <SelectItem value="4.5">4.5+ Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    setSearchFilters({
                      query: "",
                      categories: [],
                      subcategories: [],
                      types: [],
                      formats: [],
                      difficulties: [],
                      languages: [],
                      tags: [],
                      authors: [],
                      priceRange: [0, 100],
                      fileSizeRange: [0, 1000],
                      rating: 0,
                      sortBy: "relevance",
                      sortOrder: "desc",
                    })
                  }
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {sampleCategories.map((category) => (
          <Card
            key={category.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedCategory === category.id ? "ring-2 ring-green-500" : ""
            }`}
            onClick={() => setSelectedCategory(selectedCategory === category.id ? "all" : category.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${category.color}`}>
                  <span className="text-lg">{category.icon}</span>
                </div>
                <div>
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-sm text-gray-600">{category.resourceCount} resources</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">{category.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-600">
          Showing {filteredResources.length} of {sampleResources.length} resources
          {selectedCategory !== "all" && (
            <span className="ml-2">
              in <Badge variant="secondary">{sampleCategories.find((c) => c.id === selectedCategory)?.name}</Badge>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download Queue (0)
          </Button>
          <Button variant="outline" size="sm">
            <FolderPlus className="h-4 w-4 mr-2" />
            New Collection
          </Button>
        </div>
      </div>

      {/* Resources Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            <Card key={resource.id} className="group hover:shadow-lg transition-all duration-200">
              <div className="relative">
                <img
                  src={resource.thumbnailUrl || "/placeholder.svg"}
                  alt={resource.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="absolute top-2 left-2 flex gap-2">
                  <Badge className={getDifficultyColor(resource.difficulty)}>{resource.difficulty}</Badge>
                  {resource.isPremium && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  {getFileIcon(resource.type)}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg leading-tight mb-1 line-clamp-2">{resource.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{resource.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={resource.author.avatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {resource.author.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-600">{resource.author.name}</span>
                  {resource.author.verificationStatus === "verified" && (
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{resource.rating}</span>
                    <span>({resource.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    <span>{resource.downloadCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <HardDrive className="h-4 w-4" />
                    <span>{formatFileSize(resource.fileSize)}</span>
                  </div>
                </div>

                {resource.duration && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(resource.duration)}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 mb-4">
                  {resource.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {resource.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{resource.tags.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {resource.price > 0 ? (
                      <span className="font-semibold text-lg">${resource.price}</span>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">Free</Badge>
                    )}
                    {resource.isOfflineAvailable && <WifiOff className="h-4 w-4 text-green-600" />}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <BookmarkPlus className="h-4 w-4" />
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <Download className="h-4 w-4 mr-2" />
                      {resource.price > 0 ? "Buy" : "Download"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResources.map((resource) => (
            <Card key={resource.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <img
                    src={resource.thumbnailUrl || "/placeholder.svg"}
                    alt={resource.title}
                    className="w-24 h-32 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getFileIcon(resource.type)}
                        <h3 className="font-semibold text-xl">{resource.title}</h3>
                        <Badge className={getDifficultyColor(resource.difficulty)}>{resource.difficulty}</Badge>
                        {resource.isPremium && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Crown className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-3 line-clamp-2">{resource.description}</p>

                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={resource.author.avatar || "/placeholder.svg"} />
                          <AvatarFallback>
                            {resource.author.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{resource.author.name}</span>
                        {resource.author.verificationStatus === "verified" && (
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{resource.rating}</span>
                        <span>({resource.reviewCount} reviews)</span>
                      </div>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Download className="h-4 w-4" />
                        <span>{resource.downloadCount.toLocaleString()} downloads</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-4 w-4" />
                        <span>{formatFileSize(resource.fileSize)}</span>
                      </div>
                      {resource.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(resource.duration)}</span>
                        </div>
                      )}
                      {resource.pages && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{resource.pages} pages</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Updated {resource.lastUpdated.toLocaleDateString()}</span>
                      </div>
                      {resource.isOfflineAvailable && (
                        <div className="flex items-center gap-1 text-green-600">
                          <WifiOff className="h-4 w-4" />
                          <span>Offline Available</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {resource.tags.slice(0, 5).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {resource.tags.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{resource.tags.length - 5} more
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {resource.price > 0 ? (
                          <span className="font-semibold text-xl">${resource.price}</span>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Free</Badge>
                        )}
                        <div className="flex gap-2">
                          <Button variant="outline">
                            <BookmarkPlus className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button className="bg-green-600 hover:bg-green-700">
                            <Download className="h-4 w-4 mr-2" />
                            {resource.price > 0 ? "Buy & Download" : "Download"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredResources.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No resources found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search criteria or browse different categories</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchFilters({
                  query: "",
                  categories: [],
                  subcategories: [],
                  types: [],
                  formats: [],
                  difficulties: [],
                  languages: [],
                  tags: [],
                  authors: [],
                  priceRange: [0, 100],
                  fileSizeRange: [0, 1000],
                  rating: 0,
                  sortBy: "relevance",
                  sortOrder: "desc",
                })
                setSelectedCategory("all")
              }}
            >
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
