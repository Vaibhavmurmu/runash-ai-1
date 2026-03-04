import { NextResponse } from "next/server"

const scalarHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>RunAsh Auth API Docs</title>
    <style>
      body { margin: 0; }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/auth/openapi"
      data-configuration='{"theme":"purple","darkMode":true,"pageTitle":"RunAsh Auth API"}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`

export async function GET() {
  return new NextResponse(scalarHtml, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  })
}
