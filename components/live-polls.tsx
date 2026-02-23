"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { useAnalytics } from "@/components/analytics-provider"
import {
  ChevronRight,
  BarChart3,
  Clock,
  Users,
  CheckCircle2,
  PlusCircle,
  AlertCircle,
  Trophy,
  TrendingUp,
  Share2,
  Download,
} from "lucide-react"

// Poll types
type PollOptionType = {
  id: string
  text: string
  votes: number
  percentage?: number
}

type PollType = {
  id: string
  question: string
  options: PollOptionType[]
  totalVotes: number
  status: "active" | "ended" | "upcoming" | "scheduled"
  createdAt: Date
  endTime?: Date
  scheduledTime?: Date
  createdBy: string
  streamId: string
  highlighted?: boolean
  category?: "product" | "general" | "feedback" | "prediction"
  allowMultipleVotes?: boolean
  showResults?: boolean
  anonymous?: boolean
  description?: string
}

interface LivePollsProps {
  streamId: string
  isHost?: boolean
}

export default function LivePolls({ streamId, isHost = false }: LivePollsProps) {
  const [activeTab, setActiveTab] = useState<string>("active")
  const [polls, setPolls] = useState<PollType[]>([])
  const [userVotes, setUserVotes] = useState<Record<string, string[]>>({})
  const [isCreatingPoll, setIsCreatingPoll] = useState(false)
  const [newPollQuestion, setNewPollQuestion] = useState("")
  const [newPollDescription, setNewPollDescription] = useState("")
  const [newPollOptions, setNewPollOptions] = useState(["", ""])
  const [newPollCategory, setNewPollCategory] = useState<"product" | "general" | "feedback" | "prediction">("general")
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false)
  const [showResults, setShowResults] = useState(true)
  const [anonymous, setAnonymous] = useState(false)
  const [pollDuration, setPollDuration] = useState(15) // minutes
  const { toast } = useToast()
  const { user } = useAuth()
  const { trackEvent } = useAnalytics()

  // Load demo polls with enhanced features
  useEffect(() => {
    const demoPolls: PollType[] = [
      {
        id: "poll-1",
        question: "Which organic product feature matters most to you?",
        description: "Help us understand what drives your organic product choices",
        options: [
          { id: "opt-1", text: "Certification & Quality", votes: 156, percentage: 35 },
          { id: "opt-2", text: "Local Sourcing", votes: 98, percentage: 22 },
          { id: "opt-3", text: "Price Value", votes: 87, percentage: 20 },
          { id: "opt-4", text: "Packaging & Sustainability", votes: 102, percentage: 23 },
        ],
        totalVotes: 443,
        status: "active",
        createdAt: new Date(Date.now() - 1000 * 60 * 5),
        endTime: new Date(Date.now() + 1000 * 60 * 10),
        createdBy: "OrganicFarms India",
        streamId,
        highlighted: true,
        category: "product",
        showResults: true,
        anonymous: false,
      },
      {
        id: "poll-2",
        question: "Would you pay ₹50 extra for carbon-neutral delivery?",
        description: "Considering eco-friendly delivery options",
        options: [
          { id: "opt-5", text: "Yes, definitely", votes: 234, percentage: 45 },
          { id: "opt-6", text: "Maybe, depends on product", votes: 178, percentage: 34 },
          { id: "opt-7", text: "No, too expensive", votes: 109, percentage: 21 },
        ],
        totalVotes: 521,
        status: "active",
        createdAt: new Date(Date.now() - 1000 * 60 * 15),
        endTime: new Date(Date.now() + 1000 * 60 * 5),
        createdBy: "EcoDelivery",
        streamId,
        category: "feedback",
        allowMultipleVotes: false,
        showResults: true,
      },
      {
        id: "poll-3",
        question: "Predict: Which organic category will grow most in 2024?",
        description: "Share your market predictions",
        options: [
          { id: "opt-8", text: "Organic Spices & Herbs", votes: 89, percentage: 28 },
          { id: "opt-9", text: "Organic Dairy Products", votes: 76, percentage: 24 },
          { id: "opt-10", text: "Organic Personal Care", votes: 95, percentage: 30 },
          { id: "opt-11", text: "Organic Baby Products", votes: 58, percentage: 18 },
        ],
        totalVotes: 318,
        status: "ended",
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
        endTime: new Date(Date.now() - 1000 * 60 * 5),
        createdBy: "Market Research Team",
        streamId,
        category: "prediction",
        showResults: true,
      },
      {
        id: "poll-4",
        question: "Rate today's organic farming workshop",
        description: "Your feedback helps us improve future sessions",
        options: [
          { id: "opt-12", text: "Excellent - Very informative", votes: 0 },
          { id: "opt-13", text: "Good - Learned something new", votes: 0 },
          { id: "opt-14", text: "Average - Could be better", votes: 0 },
          { id: "opt-15", text: "Poor - Not helpful", votes: 0 },
        ],
        totalVotes: 0,
        status: "scheduled",
        scheduledTime: new Date(Date.now() + 1000 * 60 * 30),
        createdAt: new Date(Date.now()),
        createdBy: "Farming Experts",
        streamId,
        category: "feedback",
        anonymous: true,
      },
    ]

    setPolls(demoPolls)

    // Simulate real-time voting
    const interval = setInterval(() => {
      setPolls((currentPolls) => {
        return currentPolls.map((poll) => {
          if (poll.status === "active") {
            const updatedOptions = poll.options.map((option) => {
              const randomVotes = Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 1 : 0
              return {
                ...option,
                votes: option.votes + randomVotes,
              }
            })

            const newTotalVotes = updatedOptions.reduce((sum, option) => sum + option.votes, 0)

            // Calculate percentages
            const optionsWithPercentages = updatedOptions.map((option) => ({
              ...option,
              percentage: newTotalVotes > 0 ? Math.round((option.votes / newTotalVotes) * 100) : 0,
            }))

            return {
              ...poll,
              options: optionsWithPercentages,
              totalVotes: newTotalVotes,
            }
          }
          return poll
        })
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [streamId])

  // Handle voting with multiple vote support
  const handleVote = (pollId: string, optionId: string) => {
    const poll = polls.find((p) => p.id === pollId)
    if (!poll) return

    const currentUserVotes = userVotes[pollId] || []

    // Check if user has already voted for this option
    if (currentUserVotes.includes(optionId)) {
      toast({
        title: "Already voted",
        description: "You have already voted for this option",
        variant: "destructive",
      })
      return
    }

    // Check if multiple votes are allowed
    if (!poll.allowMultipleVotes && currentUserVotes.length > 0) {
      toast({
        title: "Single vote only",
        description: "You can only vote once in this poll",
        variant: "destructive",
      })
      return
    }

    // Update polls with new vote
    setPolls((currentPolls) =>
      currentPolls.map((p) => {
        if (p.id === pollId) {
          const updatedOptions = p.options.map((option) => {
            if (option.id === optionId) {
              return { ...option, votes: option.votes + 1 }
            }
            return option
          })

          const newTotalVotes = updatedOptions.reduce((sum, option) => sum + option.votes, 0)

          // Calculate percentages
          const optionsWithPercentages = updatedOptions.map((option) => ({
            ...option,
            percentage: newTotalVotes > 0 ? Math.round((option.votes / newTotalVotes) * 100) : 0,
          }))

          return {
            ...p,
            options: optionsWithPercentages,
            totalVotes: newTotalVotes,
          }
        }
        return p
      }),
    )

    // Record user's vote
    setUserVotes((prev) => ({
      ...prev,
      [pollId]: [...currentUserVotes, optionId],
    }))

    // Show success toast
    toast({
      title: "Vote recorded",
      description: poll.allowMultipleVotes
        ? "Your vote has been added. You can vote for other options too!"
        : "Your vote has been recorded successfully",
    })

    // Track analytics event
    trackEvent("poll_vote", {
      pollId,
      optionId,
      streamId,
      userId: user?.id || "anonymous",
      category: poll.category,
      allowMultiple: poll.allowMultipleVotes,
    })
  }

  // Enhanced poll creation
  const createPoll = () => {
    if (!newPollQuestion.trim()) {
      toast({
        title: "Missing question",
        description: "Please enter a question for the poll",
        variant: "destructive",
      })
      return
    }

    const validOptions = newPollOptions.filter((opt) => opt.trim() !== "")
    if (validOptions.length < 2) {
      toast({
        title: "Not enough options",
        description: "Please provide at least 2 options",
        variant: "destructive",
      })
      return
    }

    const newPoll: PollType = {
      id: `poll-${Date.now()}`,
      question: newPollQuestion,
      description: newPollDescription,
      options: validOptions.map((text, index) => ({
        id: `new-opt-${index}`,
        text,
        votes: 0,
        percentage: 0,
      })),
      totalVotes: 0,
      status: "active",
      createdAt: new Date(),
      endTime: new Date(Date.now() + pollDuration * 60 * 1000),
      createdBy: user?.name || "Host",
      streamId,
      category: newPollCategory,
      allowMultipleVotes,
      showResults,
      anonymous,
    }

    setPolls((prev) => [newPoll, ...prev])

    // Reset form
    setNewPollQuestion("")
    setNewPollDescription("")
    setNewPollOptions(["", ""])
    setNewPollCategory("general")
    setAllowMultipleVotes(false)
    setShowResults(true)
    setAnonymous(false)
    setPollDuration(15)
    setIsCreatingPoll(false)

    toast({
      title: "Poll created",
      description: "Your poll is now live and accepting votes",
    })

    trackEvent("poll_created", {
      pollId: newPoll.id,
      streamId,
      userId: user?.id || "anonymous",
      category: newPoll.category,
      duration: pollDuration,
    })
  }

  // Enhanced poll management functions
  const endPoll = (pollId: string) => {
    setPolls((currentPolls) =>
      currentPolls.map((poll) => {
        if (poll.id === pollId) {
          return {
            ...poll,
            status: "ended",
            endTime: new Date(),
          }
        }
        return poll
      }),
    )

    toast({
      title: "Poll ended",
      description: "The poll has been ended and results are final",
    })
  }

  const toggleHighlight = (pollId: string) => {
    setPolls((currentPolls) =>
      currentPolls.map((poll) => {
        if (poll.id === pollId) {
          return { ...poll, highlighted: !poll.highlighted }
        }
        if (poll.highlighted && poll.id !== pollId) {
          return { ...poll, highlighted: false }
        }
        return poll
      }),
    )
  }

  const sharePoll = (poll: PollType) => {
    const shareText = `Vote in our live poll: "${poll.question}" - Join the discussion!`
    if (navigator.share) {
      navigator.share({
        title: "Live Poll",
        text: shareText,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(`${shareText} ${window.location.href}`)
      toast({
        title: "Link copied",
        description: "Poll link has been copied to clipboard",
      })
    }
  }

  const exportResults = (poll: PollType) => {
    const results = {
      question: poll.question,
      totalVotes: poll.totalVotes,
      options: poll.options.map((opt) => ({
        text: opt.text,
        votes: opt.votes,
        percentage: opt.percentage,
      })),
      createdAt: poll.createdAt,
      endTime: poll.endTime,
    }

    const dataStr = JSON.stringify(results, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `poll-results-${poll.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Get time remaining for active polls
  const getTimeRemaining = (endTime?: Date) => {
    if (!endTime) return "No end time"

    const now = new Date()
    const diff = endTime.getTime() - now.getTime()

    if (diff <= 0) return "Ending soon"

    const minutes = Math.floor(diff / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return `${minutes}m ${seconds}s remaining`
  }

  // Filter polls based on active tab
  const filteredPolls = polls.filter((poll) => {
    if (activeTab === "active") return poll.status === "active"
    if (activeTab === "ended") return poll.status === "ended"
    if (activeTab === "upcoming") return poll.status === "upcoming" || poll.status === "scheduled"
    if (activeTab === "highlighted") return poll.highlighted
    return true
  })

  // Get category icon
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "product":
        return "🛍️"
      case "feedback":
        return "💬"
      case "prediction":
        return "🔮"
      default:
        return "📊"
    }
  }

  // Get category color
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "product":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "feedback":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "prediction":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Interactive Live Polls</CardTitle>
            <CardDescription>Engage with real-time polls during the stream</CardDescription>
          </div>
          {isHost && (
            <Button
              onClick={() => setIsCreatingPoll(true)}
              className="bg-orange-500 hover:bg-orange-600"
              disabled={isCreatingPoll}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Poll
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-1">
        {/* Enhanced Poll Creation Form */}
        {isCreatingPoll && (
          <Card className="border-2 border-dashed border-orange-200 dark:border-orange-800 p-4 mb-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-lg">Create Interactive Poll</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div>
                <label htmlFor="question" className="block text-sm font-medium mb-1">
                  Question *
                </label>
                <Input
                  id="question"
                  value={newPollQuestion}
                  onChange={(e) => setNewPollQuestion(e.target.value)}
                  placeholder="What would you like to ask your audience?"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Description (Optional)
                </label>
                <Textarea
                  id="description"
                  value={newPollDescription}
                  onChange={(e) => setNewPollDescription(e.target.value)}
                  placeholder="Add context or additional information..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={newPollCategory}
                    onChange={(e) => setNewPollCategory(e.target.value as any)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="general">General</option>
                    <option value="product">Product</option>
                    <option value="feedback">Feedback</option>
                    <option value="prediction">Prediction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                  <Input
                    type="number"
                    value={pollDuration}
                    onChange={(e) => setPollDuration(Number(e.target.value))}
                    min={1}
                    max={60}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Options *</label>
                <div className="space-y-2">
                  {newPollOptions.map((option, index) => (
                    <Input
                      key={index}
                      value={option}
                      onChange={(e) => {
                        const updated = [...newPollOptions]
                        updated[index] = e.target.value
                        setNewPollOptions(updated)
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewPollOptions([...newPollOptions, ""])}
                  className="mt-2"
                  disabled={newPollOptions.length >= 6}
                >
                  Add Option
                </Button>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={allowMultipleVotes}
                    onChange={(e) => setAllowMultipleVotes(e.target.checked)}
                  />
                  <span className="text-sm">Allow multiple votes</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={showResults} onChange={(e) => setShowResults(e.target.checked)} />
                  <span className="text-sm">Show live results</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
                  <span className="text-sm">Anonymous voting</span>
                </label>
              </div>
            </CardContent>
            <CardFooter className="p-0 pt-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreatingPoll(false)}>
                Cancel
              </Button>
              <Button onClick={createPoll} className="bg-orange-500 hover:bg-orange-600">
                Create Poll
              </Button>
            </CardFooter>
          </Card>
        )}

        <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="active" className="text-xs sm:text-sm">
              Active ({filteredPolls.filter((p) => p.status === "active").length})
            </TabsTrigger>
            <TabsTrigger value="ended" className="text-xs sm:text-sm">
              Ended ({filteredPolls.filter((p) => p.status === "ended").length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
              Upcoming ({filteredPolls.filter((p) => p.status === "upcoming" || p.status === "scheduled").length})
            </TabsTrigger>
            <TabsTrigger value="highlighted" className="text-xs sm:text-sm">
              Featured ({filteredPolls.filter((p) => p.highlighted).length})
            </TabsTrigger>
          </TabsList>

          {["active", "ended", "upcoming", "highlighted"].map((tab) => (
            <TabsContent key={tab} value={tab} className="m-0">
              {filteredPolls.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No {tab} polls available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPolls.map((poll) => (
                    <Card
                      key={poll.id}
                      className={`overflow-hidden ${poll.highlighted ? "border-orange-500 dark:border-orange-400 shadow-lg" : ""}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getCategoryColor(poll.category)}>
                                {getCategoryIcon(poll.category)} {poll.category}
                              </Badge>
                              <Badge
                                variant={
                                  poll.status === "active"
                                    ? "default"
                                    : poll.status === "ended"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {poll.status === "active" ? "🔴 Live" : poll.status === "ended" ? "Ended" : "Upcoming"}
                              </Badge>
                              {poll.highlighted && (
                                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  <Trophy className="h-3 w-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-base">{poll.question}</CardTitle>
                            {poll.description && (
                              <p className="text-sm text-muted-foreground mt-1">{poll.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-muted-foreground flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {poll.totalVotes.toLocaleString()} votes
                              </span>
                              {poll.status === "active" && poll.endTime && (
                                <span className="text-xs text-muted-foreground flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {getTimeRemaining(poll.endTime)}
                                </span>
                              )}
                              {poll.allowMultipleVotes && (
                                <span className="text-xs text-blue-600 dark:text-blue-400">Multiple votes allowed</span>
                              )}
                              {poll.anonymous && (
                                <span className="text-xs text-purple-600 dark:text-purple-400">Anonymous</span>
                              )}
                            </div>
                          </div>
                          {isHost && poll.status === "active" && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleHighlight(poll.id)}
                                className={poll.highlighted ? "bg-orange-100 dark:bg-orange-900/30" : ""}
                              >
                                {poll.highlighted ? "Unfeature" : "Feature"}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => endPoll(poll.id)}>
                                End Poll
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="space-y-3">
                          {poll.options.map((option) => {
                            const percentage = option.percentage || 0
                            const userVotedForThis = userVotes[poll.id]?.includes(option.id)

                            return (
                              <div key={option.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-sm ${userVotedForThis ? "font-medium text-orange-600" : ""}`}
                                    >
                                      {option.text}
                                      {userVotedForThis && (
                                        <CheckCircle2 className="inline-block ml-1 h-3 w-3 text-orange-500" />
                                      )}
                                    </span>
                                  </div>
                                  {poll.showResults && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{percentage}%</span>
                                      <span className="text-xs text-muted-foreground">
                                        ({option.votes.toLocaleString()})
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {poll.showResults && (
                                  <Progress
                                    value={percentage}
                                    className={`h-2 ${userVotedForThis ? "bg-orange-100" : ""}`}
                                  />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2">
                        {poll.status === "active" && (
                          <div className="w-full">
                            {!userVotes[poll.id] || poll.allowMultipleVotes ? (
                              <div className="grid grid-cols-2 gap-2">
                                {poll.options.map((option) => (
                                  <Button
                                    key={option.id}
                                    variant={userVotes[poll.id]?.includes(option.id) ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleVote(poll.id, option.id)}
                                    className="w-full"
                                    disabled={userVotes[poll.id]?.includes(option.id)}
                                  >
                                    {option.text}
                                    <ChevronRight className="ml-auto h-4 w-4" />
                                  </Button>
                                ))}
                              </div>
                            ) : (
                              <div className="w-full text-center text-sm text-muted-foreground">
                                ✅ Thanks for voting! Results are updating live.
                              </div>
                            )}
                          </div>
                        )}

                        {poll.status === "ended" && (
                          <div className="w-full flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                Poll ended{" "}
                                {poll.endTime
                                  ? new Date(poll.endTime).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : ""}
                              </span>
                              {poll.totalVotes > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  {poll.totalVotes} total votes
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => sharePoll(poll)}>
                                <Share2 className="h-4 w-4" />
                              </Button>
                              {isHost && (
                                <Button variant="outline" size="sm" onClick={() => exportResults(poll)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="outline" size="sm">
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Results
                              </Button>
                            </div>
                          </div>
                        )}

                        {(poll.status === "upcoming" || poll.status === "scheduled") && (
                          <div className="w-full text-center text-sm text-muted-foreground">
                            {poll.scheduledTime ? (
                              <>
                                Scheduled for{" "}
                                {poll.scheduledTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </>
                            ) : (
                              "This poll will be available soon"
                            )}
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
