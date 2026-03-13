import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireStreamOwner } from "../_auth"

type GenerateInput = {
  prompt?: string
  style?: string
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const access = await requireStreamOwner(request, params.id)
  if (access.error) return access.error

  try {
    const body = (await request.json()) as GenerateInput
    const prompt = body.prompt?.trim()
    const style = body.style?.trim() || "cinematic"

    if (!prompt) {
      return respondError(request, { code: "VALIDATION_FAILED", message: "Prompt is required." }, { status: 400 })
    }

    const escapedPrompt = prompt.replace(/[<>&]/g, "")
    const escapedStyle = style.replace(/[<>&]/g, "")
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='#f97316'/><stop offset='100%' stop-color='#f59e0b'/></linearGradient></defs><rect width='1280' height='720' fill='url(#g)'/><text x='72' y='598' fill='white' font-size='32'>${escapedPrompt}</text><text x='72' y='650' fill='white' font-size='22'>AI style: ${escapedStyle}</text></svg>`

    return respondSuccess(request, {
      generated: {
        name: `${escapedStyle} · ${escapedPrompt.slice(0, 32)}`,
        url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
        thumbnailUrl: "",
        category: ["custom"],
        tags: ["ai", escapedStyle],
        isPremium: false,
        prompt,
        style,
      },
    })
  } catch {
    return respondError(request, { code: "STREAM_BACKGROUND_GENERATION_FAILED", message: "Could not generate background." }, { status: 500 })
  }
}
