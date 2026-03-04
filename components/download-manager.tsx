"use client"

import { SelectItem } from "@/components/ui/select"

import { SelectContent } from "@/components/ui/select"

import { SelectValue } from "@/components/ui/select"

import { SelectTrigger } from "@/components/ui/select"

import { Select } from "@/components/ui/select"

import { Input } from "@/components/ui/input"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Download,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  HardDrive,
  FolderOpen,
  Settings,
  FileText,
  Video,
  Headphones,
  ImageIcon,
  Presentation,
  BookOpen,
  Eye,
  Share2,
  Star,
  Calendar,
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react"
import type { DownloadedResource, DownloadQueue } from "@/types/downloadable-resources"

// Sample downloaded resources data
const sampleDownloadedResources: DownloadedResource[] = [
  {
    id: "downloaded-1",
    resourceId: "soil-testing-guide",
    resource: {
      id: "soil-testing-guide",
      title: "Complete Soil Testing Guide",
      description: "Comprehensive guide covering all aspects of soil testing",
      category: "soil-health",
      subcategory: "soil-testing",
      type: "pdf",
      format: "PDF",
      fileSize: 15728640,
      pages: 120,
      language: "English",
      difficulty: "intermediate",
      tags: ["soil testing", "pH", "nutrients"],
      author: {
        id: "dr-sarah-johnson",
        name: "Dr. Sarah Johnson",
        title: "Soil Scientist",
        bio: "",
        avatar: "/placeholder.svg?height=40&width=40",
        expertise: [],
        credentials: [],
        socialLinks: [],
        verificationStatus: "verified",
      },
      publishedDate: new Date("2024-01-15"),
      lastUpdated: new Date("2024-01-20"),
      version: "2.1",
      downloadUrl: "/downloads/soil-testing-guide.pdf",
      thumbnailUrl: "/placeholder.svg?height=200&width=150",
      price: 0,
      isPremium: false,
      isOfflineAvailable: true,
      downloadCount: 1247,
      rating: 4.8,
      reviewCount: 89,
      fileHash: "sha256:abc123...",
      relatedResources: [],
      isInteractive: false,
      hasQuiz: true,
      hasWorksheet: true,
      accessLevel: "free",
      licenseType: "educational",
      metadata: {
        keywords: [],
        topics: [],
        learningObjectives: [],
        prerequisites: [],
        targetAudience: [],
        practicalApplications: [],
        tools: [],
        techniques: [],
        regions: [],
        seasons: [],
        crops: [],
        equipment: [],
      },
    },
    downloadedAt: new Date("2024-01-20T10:30:00"),
    lastAccessedAt: new Date("2024-01-25T14:20:00"),
    localPath: "/storage/downloads/soil-testing-guide.pdf",
    downloadProgress: 100,
    downloadStatus: "completed",
    fileSize: 15728640,
    downloadedSize: 15728640,
    isOfflineAvailable: true,
    syncStatus: "synced",
    accessCount: 12,
    bookmarks: [
      {
        id: "bookmark-1",
        resourceId: "soil-testing-guide",
        title: "pH Testing Methods",
        description: "Important section on different pH testing approaches",
        position: 45,
        createdAt: new Date("2024-01-22"),
        tags: ["pH", "testing"],
      },
    ],
    notes: [
      {
        id: "note-1",
        resourceId: "soil-testing-guide",
        content: "Remember to calibrate pH meter before each use",
        position: 47,
        createdAt: new Date("2024-01-22"),
        updatedAt: new Date("2024-01-22"),
        isPrivate: true,
        tags: ["reminder"],
        attachments: [],
      },
    ],
    highlights: [],
    completionPercentage: 75,
    isFavorite: true,
    collections: ["soil-management", "essential-guides"],
  },
  {
    id: "downloaded-2",
    resourceId: "composting-video-series",
    resource: {
      id: "composting-video-series",
      title: "Advanced Composting Techniques Video Series",
      description: "Professional video series covering advanced composting methods",
      category: "soil-health",
      subcategory: "composting",
      type: "video",
      format: "MP4",
      fileSize: 524288000,
      duration: 7200,
      language: "English",
      difficulty: "advanced",
      tags: ["composting", "vermicomposting", "bokashi"],
      author: {
        id: "maria-rodriguez",
        name: "Maria Rodriguez",
        title: "Composting Specialist",
        bio: "",
        avatar: "/placeholder.svg?height=40&width=40",
        expertise: [],
        credentials: [],
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
      relatedResources: [],
      isInteractive: true,
      hasQuiz: true,
      hasWorksheet: false,
      accessLevel: "premium",
      licenseType: "personal",
      metadata: {
        keywords: [],
        topics: [],
        learningObjectives: [],
        prerequisites: [],
        targetAudience: [],
        practicalApplications: [],
        tools: [],
        techniques: [],
        regions: [],
        seasons: [],
        crops: [],
        equipment: [],
      },
    },
    downloadedAt: new Date("2024-01-18T16:45:00"),
    lastAccessedAt: new Date("2024-01-24T09:15:00"),
    localPath: "/storage/downloads/composting-video-series.mp4",
    downloadProgress: 100,
    downloadStatus: "completed",
    fileSize: 524288000,
    downloadedSize: 524288000,
    isOfflineAvailable: true,
    syncStatus: "synced",
    accessCount: 8,
    bookmarks: [],
    notes: [],
    highlights: [],
    lastPosition: 3600, // 1 hour into the video
    completionPercentage: 50,
    isFavorite: false,
    collections: ["premium-content"],
  },
]

const sampleDownloadQueue: DownloadQueue = {
  id: "queue-1",
  resources: [
    {
      id: "queued-1",
      resourceId: "ipm-handbook",
      resource: {
        id: "ipm-handbook",
        title: "Integrated Pest Management Handbook",
        description: "Comprehensive handbook for implementing IPM strategies",
        category: "pest-management",
        subcategory: "biological-control",
        type: "ebook",
        format: "EPUB",
        fileSize: 8388608,
        pages: 200,
        language: "English",
        difficulty: "intermediate",
        tags: ["IPM", "pest control", "biological control"],
        author: {
          id: "dr-michael-chen",
          name: "Dr. Michael Chen",
          title: "Entomologist",
          bio: "",
          avatar: "/placeholder.svg?height=40&width=40",
          expertise: [],
          credentials: [],
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
        relatedResources: [],
        isInteractive: false,
        hasQuiz: true,
        hasWorksheet: true,
        accessLevel: "premium",
        licenseType: "educational",
        metadata: {
          keywords: [],
          topics: [],
          learningObjectives: [],
          prerequisites: [],
          targetAudience: [],
          practicalApplications: [],
          tools: [],
          techniques: [],
          regions: [],
          seasons: [],
          crops: [],
          equipment: [],
        },
      },
      priority: 1,
      addedAt: new Date("2024-01-25T08:00:00"),
      progress: 65,
      status: "downloading",
      retryCount: 0,
      maxRetries: 3,
    },
  ],
  totalSize: 8388608,
  downloadedSize: 5452595,
  overallProgress: 65,
  estimatedTimeRemaining: 120,
  downloadSpeed: 45000,
  status: "downloading",
  autoDownload: true,
  wifiOnly: false,
  maxConcurrentDownloads: 3,
}

export default function DownloadManager() {
  const [activeTab, setActiveTab] = useState("downloaded")
  const [downloadedResources, setDownloadedResources] = useState(sampleDownloadedResources)
  const [downloadQueue, setDownloadQueue] = useState(sampleDownloadQueue)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("lastAccessed")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterStatus, setFilterStatus] = useState("all")
  const [settings, setSettings] = useState({
    autoDownload: true,
    wifiOnly: false,
    maxConcurrentDownloads: 3,
    autoSync: true,
    downloadNotifications: true,
  })

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

  const formatSpeed = (bytesPerSecond: number) => {
    return formatFileSize(bytesPerSecond) + "/s"
  }

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "downloading":
        return <Download className="h-4 w-4 text-blue-600" />
      case "paused":
        return <Pause className="h-4 w-4 text-yellow-600" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case "queued":
        return <Clock className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "downloading":
        return "bg-blue-100 text-blue-800"
      case "paused":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "queued":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const pauseDownload = (downloadId: string) => {
    setDownloadQueue((prev) => ({
      ...prev,
      resources: prev.resources.map((resource) =>
        resource.id === downloadId ? { ...resource, status: "paused" as const } : resource,
      ),
      status: "paused",
    }))
  }

  const resumeDownload = (downloadId: string) => {
    setDownloadQueue((prev) => ({
      ...prev,
      resources: prev.resources.map((resource) =>
        resource.id === downloadId ? { ...resource, status: "downloading" as const } : resource,
      ),
      status: "downloading",
    }))
  }

  const retryDownload = (downloadId: string) => {
    setDownloadQueue((prev) => ({
      ...prev,
      resources: prev.resources.map((resource) =>
        resource.id === downloadId
          ? { ...resource, status: "downloading" as const, retryCount: resource.retryCount + 1 }
          : resource,
      ),
      status: "downloading",
    }))
  }

  const removeFromQueue = (downloadId: string) => {
    setDownloadQueue((prev) => ({
      ...prev,
      resources: prev.resources.filter((resource) => resource.id !== downloadId),
    }))
  }

  const deleteDownload = (downloadId: string) => {
    setDownloadedResources((prev) => prev.filter((resource) => resource.id !== downloadId))
  }

  const openResource = (resource: DownloadedResource) => {
    // Update last accessed time and access count
    setDownloadedResources((prev) =>
      prev.map((r) =>
        r.id === resource.id
          ? {
              ...r,
              lastAccessedAt: new Date(),
              accessCount: r.accessCount + 1,
            }
          : r,
      ),
    )
    // Open the resource (implementation would depend on the platform)
    console.log("Opening resource:", resource.resource.title)
  }

  const filteredDownloads = downloadedResources
    .filter((resource) => {
      if (searchQuery) {
        return (
          resource.resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          resource.resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          resource.resource.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      }
      return true
    })
    .filter((resource) => {
      if (filterStatus === "all") return true
      return resource.downloadStatus === filterStatus
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "title":
          comparison = a.resource.title.localeCompare(b.resource.title)
          break
        case "downloadedAt":
          comparison = a.downloadedAt.getTime() - b.downloadedAt.getTime()
          break
        case "lastAccessed":
          comparison = a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime()
          break
        case "fileSize":
          comparison = a.fileSize - b.fileSize
          break
        case "accessCount":
          comparison = a.accessCount - b.accessCount
          break
        default:
          comparison = 0
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

  const totalDownloadedSize = downloadedResources.reduce((total, resource) => total + resource.fileSize, 0)
  const totalResources = downloadedResources.length
  const completedResources = downloadedResources.filter((r) => r.downloadStatus === "completed").length

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Download Manager</h1>
        <p className="text-gray-600">Manage your downloaded resources and offline content</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Download className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalResources}</div>
                <div className="text-sm text-gray-600">Total Downloads</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{completedResources}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <HardDrive className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatFileSize(totalDownloadedSize)}</div>
                <div className="text-sm text-gray-600">Storage Used</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{downloadQueue.resources.length}</div>
                <div className="text-sm text-gray-600">In Queue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="downloaded">Downloaded ({totalResources})</TabsTrigger>
          <TabsTrigger value="queue">Queue ({downloadQueue.resources.length})</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="downloaded" className="space-y-6">
          {/* Search and Filter Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search downloaded resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full lg:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="downloading">Downloading</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full lg:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lastAccessed">Last Accessed</SelectItem>
                    <SelectItem value="downloadedAt">Download Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="fileSize">File Size</SelectItem>
                    <SelectItem value="accessCount">Access Count</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                  {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Downloaded Resources List */}
          <div className="space-y-4">
            {filteredDownloads.map((download) => (
              <Card key={download.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <img
                      src={download.resource.thumbnailUrl || "/placeholder.svg"}
                      alt={download.resource.title}
                      className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getFileIcon(download.resource.type)}
                          <h3 className="font-semibold text-lg">{download.resource.title}</h3>
                          <Badge className={getStatusColor(download.downloadStatus)}>
                            {getStatusIcon(download.downloadStatus)}
                            <span className="ml-1 capitalize">{download.downloadStatus}</span>
                          </Badge>
                          {download.isFavorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openResource(download)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Open
                          </Button>
                          <Button size="sm" variant="outline">
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteDownload(download.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{download.resource.description}</p>

                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={download.resource.author.avatar || "/placeholder.svg"} />
                            <AvatarFallback>
                              {download.resource.author.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{download.resource.author.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{download.resource.rating}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-4 w-4" />
                          <span>{formatFileSize(download.fileSize)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Downloaded {download.downloadedAt.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>Accessed {download.accessCount} times</span>
                        </div>
                        {download.resource.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(download.resource.duration)}</span>
                          </div>
                        )}
                      </div>

                      {download.completionPercentage > 0 && download.completionPercentage < 100 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{download.completionPercentage}%</span>
                          </div>
                          <Progress value={download.completionPercentage} className="h-2" />
                        </div>
                      )}

                      {download.bookmarks.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium mb-2">Bookmarks ({download.bookmarks.length})</div>
                          <div className="flex flex-wrap gap-2">
                            {download.bookmarks.slice(0, 3).map((bookmark) => (
                              <Badge key={bookmark.id} variant="outline" className="text-xs">
                                {bookmark.title}
                              </Badge>
                            ))}
                            {download.bookmarks.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{download.bookmarks.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {download.collections.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FolderOpen className="h-4 w-4" />
                          <span>In collections: {download.collections.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredDownloads.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-gray-400 mb-4">
                  <Download className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No downloads found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || filterStatus !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Start downloading resources to see them here"}
                </p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          {/* Queue Status */}
          {downloadQueue.resources.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Download Queue</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDownloadQueue((prev) => ({
                          ...prev,
                          status: prev.status === "downloading" ? "paused" : "downloading",
                        }))
                      }
                    >
                      {downloadQueue.status === "downloading" ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause All
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Resume All
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Queue Settings
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{downloadQueue.resources.length}</div>
                    <div className="text-sm text-gray-600">Items in Queue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{formatFileSize(downloadQueue.totalSize)}</div>
                    <div className="text-sm text-gray-600">Total Size</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {downloadQueue.estimatedTimeRemaining > 0
                        ? formatTimeRemaining(downloadQueue.estimatedTimeRemaining)
                        : "—"}
                    </div>
                    <div className="text-sm text-gray-600">Time Remaining</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{downloadQueue.overallProgress}%</span>
                  </div>
                  <Progress value={downloadQueue.overallProgress} className="h-2" />
                  {downloadQueue.downloadSpeed > 0 && (
                    <div className="text-sm text-gray-500 text-center">
                      Downloading at {formatSpeed(downloadQueue.downloadSpeed)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Queue Items */}
          <div className="space-y-4">
            {downloadQueue.resources.map((queuedDownload) => (
              <Card key={queuedDownload.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <img
                      src={queuedDownload.resource.thumbnailUrl || "/placeholder.svg"}
                      alt={queuedDownload.resource.title}
                      className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getFileIcon(queuedDownload.resource.type)}
                          <h3 className="font-semibold text-lg">{queuedDownload.resource.title}</h3>
                          <Badge className={getStatusColor(queuedDownload.status)}>
                            {getStatusIcon(queuedDownload.status)}
                            <span className="ml-1 capitalize">{queuedDownload.status}</span>
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          {queuedDownload.status === "downloading" && (
                            <Button size="sm" variant="outline" onClick={() => pauseDownload(queuedDownload.id)}>
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {queuedDownload.status === "paused" && (
                            <Button size="sm" variant="outline" onClick={() => resumeDownload(queuedDownload.id)}>
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {queuedDownload.status === "failed" && (
                            <Button size="sm" variant="outline" onClick={() => retryDownload(queuedDownload.id)}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => removeFromQueue(queuedDownload.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm mb-3">{queuedDownload.resource.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-4 w-4" />
                          <span>{formatFileSize(queuedDownload.resource.fileSize)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Added {queuedDownload.addedAt.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{queuedDownload.resource.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>Priority: {queuedDownload.priority}</span>
                        </div>
                      </div>

                      {queuedDownload.status === "downloading" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress</span>
                            <span>{queuedDownload.progress}%</span>
                          </div>
                          <Progress value={queuedDownload.progress} className="h-2" />
                        </div>
                      )}

                      {queuedDownload.status === "failed" && queuedDownload.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          Error: {queuedDownload.errorMessage}
                          {queuedDownload.retryCount < queuedDownload.maxRetries && (
                            <span className="ml-2">
                              (Retry {queuedDownload.retryCount + 1}/{queuedDownload.maxRetries})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {downloadQueue.resources.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-gray-400 mb-4">
                  <Clock className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Download queue is empty</h3>
                <p className="text-gray-600">Add resources to your download queue to see them here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="collections" className="space-y-6">
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-400 mb-4">
                <FolderOpen className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Collections feature coming soon</h3>
              <p className="text-gray-600">Organize your downloads into custom collections for better management</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Download Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-download">Auto-download</Label>
                  <p className="text-sm text-gray-600">Automatically start downloads when added to queue</p>
                </div>
                <Switch
                  id="auto-download"
                  checked={settings.autoDownload}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoDownload: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="wifi-only">WiFi only</Label>
                  <p className="text-sm text-gray-600">Only download when connected to WiFi</p>
                </div>
                <Switch
                  id="wifi-only"
                  checked={settings.wifiOnly}
                  onCheckedChange={(checked) => setSettings({ ...settings, wifiOnly: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-sync">Auto-sync</Label>
                  <p className="text-sm text-gray-600">Automatically sync updates for downloaded resources</p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={settings.autoSync}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoSync: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications">Download notifications</Label>
                  <p className="text-sm text-gray-600">Show notifications when downloads complete</p>
                </div>
                <Switch
                  id="notifications"
                  checked={settings.downloadNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, downloadNotifications: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-concurrent">Maximum concurrent downloads</Label>
                <Select
                  value={settings.maxConcurrentDownloads.toString()}
                  onValueChange={(value) =>
                    setSettings({ ...settings, maxConcurrentDownloads: Number.parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 download</SelectItem>
                    <SelectItem value="2">2 downloads</SelectItem>
                    <SelectItem value="3">3 downloads</SelectItem>
                    <SelectItem value="5">5 downloads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storage Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Total storage used</span>
                <span className="font-semibold">{formatFileSize(totalDownloadedSize)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>
                <Button variant="outline">
                  <HardDrive className="h-4 w-4 mr-2" />
                  Manage Storage
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
