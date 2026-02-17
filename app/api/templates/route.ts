import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"

// Mock template data - in production this would come from database
const mockTemplates = [
  {
    id: "overlay-modern-1",
    name: "Modern Stream Overlay",
    description: "Clean and modern overlay with customizable colors",
    category: "overlay",
    thumbnailUrl: "/templates/modern-overlay-thumb.jpg",
    variables: [
      { name: "streamerName", type: "text", defaultValue: "Streamer", description: "Your streaming name" },
      { name: "primaryColor", type: "color", defaultValue: "#f97316", description: "Primary accent color" },
      { name: "showFollowerCount", type: "boolean", defaultValue: true, description: "Display follower count" },
      { name: "followerCount", type: "number", defaultValue: 1234, description: "Current follower count" },
    ],
    html: `
      <div class="stream-overlay">
        <div class="header-bar">
          <h1 class="streamer-name">{{streamerName}}</h1>
          {{#if showFollowerCount}}
          <div class="follower-count">{{followerCount}} followers</div>
          {{/if}}
        </div>
        <div class="content-area">
          <slot></slot>
        </div>
      </div>
    `,
    css: `
      .stream-overlay {
        position: relative;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%);
        color: white;
        font-family: 'Inter', sans-serif;
      }
      .header-bar {
        position: absolute;
        top: 20px;
        left: 20px;
        right: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(10px);
        padding: 12px 20px;
        border-radius: 12px;
        border: 1px solid {{primaryColor}};
      }
      .streamer-name {
        font-size: 24px;
        font-weight: 700;
        margin: 0;
        color: {{primaryColor}};
      }
      .follower-count {
        font-size: 14px;
        opacity: 0.9;
      }
    `,
    isPremium: false,
    tags: ["modern", "clean", "overlay"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    downloadCount: 1250,
    rating: 4.8,
    author: "RunAsh Team",
  },
  {
    id: "alert-celebration-1",
    name: "Celebration Alert",
    description: "Animated celebration alert for followers and subs",
    category: "alert",
    thumbnailUrl: "/templates/celebration-alert-thumb.jpg",
    variables: [
      { name: "username", type: "text", defaultValue: "NewFollower", description: "Username to display" },
      { name: "message", type: "text", defaultValue: "Thanks for following!", description: "Alert message" },
      { name: "alertColor", type: "color", defaultValue: "#10b981", description: "Alert accent color" },
      { name: "duration", type: "number", defaultValue: 5, description: "Display duration in seconds" },
    ],
    html: `
      <div class="celebration-alert">
        <div class="alert-content">
          <div class="celebration-icon">🎉</div>
          <h2 class="username">{{username}}</h2>
          <p class="message">{{message}}</p>
        </div>
        <div class="confetti"></div>
      </div>
    `,
    css: `
      .celebration-alert {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, {{alertColor}} 0%, rgba(255,255,255,0.1) 100%);
        padding: 30px;
        border-radius: 20px;
        text-align: center;
        color: white;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        animation: slideIn 0.5s ease-out;
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255,255,255,0.2);
      }
      .celebration-icon {
        font-size: 48px;
        margin-bottom: 10px;
        animation: bounce 1s infinite;
      }
      .username {
        font-size: 28px;
        font-weight: 700;
        margin: 10px 0;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      }
      .message {
        font-size: 16px;
        margin: 0;
        opacity: 0.9;
      }
      @keyframes slideIn {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, -50%); opacity: 1; }
      }
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
      }
    `,
    javascript: `
      setTimeout(() => {
        document.querySelector('.celebration-alert').style.animation = 'slideOut 0.5s ease-in forwards';
      }, {{duration}} * 1000);
    `,
    isPremium: false,
    tags: ["celebration", "alert", "animated"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    downloadCount: 890,
    rating: 4.6,
    author: "RunAsh Team",
  },
]

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const tags = searchParams.getAll("tags")

    let filteredTemplates = [...mockTemplates]

    if (category) {
      filteredTemplates = filteredTemplates.filter((t) => t.category === category)
    }

    if (tags.length > 0) {
      filteredTemplates = filteredTemplates.filter((t) => tags.some((tag) => t.tags.includes(tag)))
    }

    return NextResponse.json({ templates: filteredTemplates })
  } catch (error) {
    console.error("Get templates error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const templateData = await req.json()

    // Validate template data
    const requiredFields = ["name", "category", "html", "css"]
    for (const field of requiredFields) {
      if (!templateData[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 })
      }
    }

    const newTemplate = {
      id: `custom-${Date.now()}`,
      ...templateData,
      author: session.user.name || "Anonymous",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      downloadCount: 0,
      rating: 0,
      isPremium: false,
    }

    // In production, save to database
    mockTemplates.push(newTemplate)

    return NextResponse.json({ template: newTemplate })
  } catch (error) {
    console.error("Create template error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
