import { MessageSquare, Users, Trophy } from "lucide-react"

export default function CommunityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Community</h1>
        <p className="text-muted-foreground mt-1">Join our growing community</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <MessageSquare className="h-8 w-8 text-primary mx-auto mb-2" />
          <h3 className="font-semibold mb-1">Discussions</h3>
          <p className="text-sm text-muted-foreground">Share ideas and get feedback</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <Users className="h-8 w-8 text-primary mx-auto mb-2" />
          <h3 className="font-semibold mb-1">Contributors</h3>
          <p className="text-sm text-muted-foreground">Join our contributor program</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
          <h3 className="font-semibold mb-1">Showcase</h3>
          <p className="text-sm text-muted-foreground">Show your amazing creations</p>
        </div>
      </div>
    </div>
  )
}
