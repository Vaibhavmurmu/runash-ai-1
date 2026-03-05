import test from "node:test"
import assert from "node:assert/strict"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { MCPServerManagerContent, type ChatMcpServer } from "@/components/chat/mcp-server-manager"

test("MCP server manager exposes add/edit/enable-disable actions", () => {
  const servers: ChatMcpServer[] = [
    {
      id: "one",
      name: "Catalog",
      endpoint: "https://example.com/catalog",
      enabled: true,
    },
    {
      id: "two",
      name: "Pricing",
      endpoint: "https://example.com/pricing",
      enabled: false,
    },
  ]

  const html = renderToStaticMarkup(
    createElement(MCPServerManagerContent, {
      servers,
      onServersChange: () => undefined,
    }),
  )

  assert.match(html, /Add server/)
  assert.match(html, /Edit/)
  assert.match(html, /Disable/)
  assert.match(html, /Enable/)
})
