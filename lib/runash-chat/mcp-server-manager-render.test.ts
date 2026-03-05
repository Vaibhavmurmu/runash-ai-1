import test from "node:test"
import assert from "node:assert/strict"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { MCPServerManagerContent, type ChatMcpServer } from "@/components/chat/mcp-server-manager"
import { MCP_MANAGER_ENABLED, RunAshChatCommandCenter } from "@/components/chat/runash-chat-command-center"

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

test("command center smoke: manager entry point is discoverable when feature flag is enabled", () => {
  if (!MCP_MANAGER_ENABLED) {
    return
  }

  const html = renderToStaticMarkup(
    createElement(RunAshChatCommandCenter, {
      quickActions: [],
      onSelectPrompt: () => undefined,
    }),
  )

  assert.match(html, /Chat settings/)
  assert.match(html, /MCP tools/)
  assert.match(html, /Manage servers/)
})
