# MCP

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) is an open specification for connecting large language model clients to external tools and resources. An MCP server exposes **tools** that a model can call during a conversation and returns results for specified parameters. Other resources (metadata) can be returned along with tool results, including inline HTML that can be used in the Apps SDK to render an interface.

With Apps SDK, MCP is the backbone that keeps server, model, and UI in sync. By standardizing wire format, authentication, and metadata, it lets ChatGPT reason about your app the same way it reasons about built-in tools.

## Protocol building blocks

A minimal MCP server for Apps SDK implements three capabilities:

1. **List tools** – your server advertises the tools it supports, including their JSON Schema input/output contracts and optional annotations.
2. **Call tools** – when a model selects a tool to use, it sends a `call_tool` request with arguments corresponding to user intent. Your server executes the action and returns structured content the model can parse.
3. **Return components** – in addition to structured content returned by the tool, each tool (in metadata) can optionally point to an [embedded resource](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#embedded-resources) representing the interface rendered in the ChatGPT client.

The protocol is transport-agnostic: you can host the server over Server-Sent Events or Streamable HTTP. Apps SDK supports both options, and Streamable HTTP is recommended.

## Why Apps SDK standardizes on MCP

Working through MCP gives several benefits out of the box:

- **Discovery integration** – the model consumes your tool metadata and surface descriptions similarly to first-party connectors, enabling natural-language discovery and launcher ranking. See [Discovery](https://developers.openai.com/apps-sdk/concepts/user-interaction) for details.
- **Conversation awareness** – structured content and component state flow through the conversation. The model can inspect JSON results, refer to IDs in follow-up turns, or render the component again later.
- **Multiclient support** – MCP is self-describing, so connectors work across ChatGPT web and mobile without custom client code.
- **Extensible auth** – the specification includes protected resource metadata, OAuth 2.1 flows, and dynamic client registration so access can be controlled without a proprietary handshake.

## Next steps

If you're new to MCP, start with:

- [Model Context Protocol specification](https://modelcontextprotocol.io/specification)
- Official SDKs: [TypeScript SDK (official; includes FastMCP module)](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) for local debugging

Once comfortable with MCP primitives, move on to [Set up your server](https://developers.openai.com/apps-sdk/build/mcp-server) for implementation details.
