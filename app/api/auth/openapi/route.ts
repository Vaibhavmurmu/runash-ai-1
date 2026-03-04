import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

const OPENAPI_FILE_PATH = path.join(process.cwd(), "docs/openapi/auth.openapi.json")

export async function GET() {
  try {
    const file = await readFile(OPENAPI_FILE_PATH, "utf8")
    return new NextResponse(file, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    })
  } catch {
    return NextResponse.json(
      {
        error: "Auth OpenAPI spec not found. Run `npm run openapi:auth:generate`.",
      },
      { status: 500 },
    )
  }
}
