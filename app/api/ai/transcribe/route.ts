import { NextResponse } from "next/server"

const snippets = [
  "Welcome to the live stream.",
  "We are optimizing quality based on your device.",
  "AI captions are active.",
  "Thank you for watching.",
]

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { language?: string }
  const language = body.language ?? "en-US"

  return NextResponse.json({
    language,
    text: snippets[Math.floor(Math.random() * snippets.length)],
    source: "fallback",
  })
}
