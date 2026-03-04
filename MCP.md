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

## Design components

### Why components matter

UI components are the human-visible half of your connector. They let users view or edit data inline, switch to fullscreen when needed, and keep context synchronized between typed prompts and UI actions. Planning components early ensures your MCP server returns the right structured data and metadata from day one.

Because ChatGPT implements the MCP Apps UI standard, a well-designed component and data contract can be portable across MCP Apps-compatible hosts.

### Explore sample components

Reusable examples are available in [openai-apps-sdk-examples](https://github.com/openai/openai-apps-sdk-examples), including the Pizzaz gallery.

#### List

Renders dynamic collections with empty-state handling. [View the code](https://github.com/openai/openai-apps-sdk-examples/tree/main/src/pizzaz-list).

![Screenshot of the Pizzaz list component](https://developers.openai.com/images/apps-sdk/pizzaz-list.png)

#### Map

Plots geo data with marker clustering and detail panes. [View the code](https://github.com/openai/openai-apps-sdk-examples/tree/main/src/pizzaz).

![Screenshot of the Pizzaz map component](https://developers.openai.com/images/apps-sdk/pizzaz-map.png)

#### Album

Showcases media grids with fullscreen transitions. [View the code](https://github.com/openai/openai-apps-sdk-examples/tree/main/src/pizzaz-albums).

![Screenshot of the Pizzaz album component](https://developers.openai.com/images/apps-sdk/pizzaz-album.png)

#### Carousel

Highlights featured content with swipe gestures. [View the code](https://github.com/openai/openai-apps-sdk-examples/tree/main/src/pizzaz-carousel).

![Screenshot of the Pizzaz carousel component](https://developers.openai.com/images/apps-sdk/pizzaz-carousel.png)

#### Shop

Demonstrates product browsing with checkout affordances. [View the code](https://github.com/openai/openai-apps-sdk-examples/tree/main/src/pizzaz-shop).

![Screenshot of the Pizzaz shop component in grid view](https://developers.openai.com/images/apps-sdk/pizzaz-shop-view.png)
![Screenshot of the Pizzaz shop component in modal view](https://developers.openai.com/images/apps-sdk/pizzaz-shop-modal.png)

### Clarify user interaction

For each use case, decide what users need to see and manipulate:

- **Viewer vs. editor** – decide whether the component is read-only or supports editing and writebacks.
- **Single-shot vs. multiturn** – decide whether the task finishes in one invocation or needs persistent state across turns.
- **Inline vs. fullscreen** – decide whether default inline cards are enough or fullscreen/PiP is better.

Write down required fields, affordances, and empty states so reviewers and design partners can validate them early.

### Map data requirements

Components should receive everything they need in tool responses. Plan for:

- **Structured content** – define the JSON payload that components parse.
- **Initial component state** – render from latest `structuredContent` delivered over MCP Apps bridge notifications (for example, `ui/notifications/tool-result`). On UI-initiated tool calls (`tools/call`), render from the returned tool result. Keep model-visible state synchronized with `ui/update-model-context`.
- **Auth context** – determine whether linked-account status should be shown, or if the model should prompt users to connect first.

Feeding this data through MCP responses is typically simpler than bolting on ad-hoc APIs later.

### Design for responsive layouts

Components run in iframes on desktop and mobile. Plan for:

- **Adaptive breakpoints** – set max width and collapse layouts gracefully on small screens.
- **Accessible color and motion** – respect system dark mode and provide keyboard focus states.
- **Launcher transitions** – keep key navigation elements visible when launched from launcher or expanded fullscreen.

Document CSS variables, font stacks, and iconography up front for consistency.

### Define the state contract

Because components and chat share conversation state, define ownership clearly:

- **Component state** – use `ui/update-model-context` for model-visible UI state. Optionally use `window.openai.setWidgetState` for UI-only persisted state across re-renders (for example selected records, scroll position, staged form data).
- **Server state** – keep authoritative state in backend/storage and define merge strategy after follow-up tool calls.
- **Model messages** – plan human-readable updates sent with `ui/message` so transcript context stays meaningful.

Capturing this state diagram early prevents difficult synchronization bugs.

### Plan telemetry and debugging hooks

Inline experiences are difficult to debug without instrumentation. Plan in advance:

- Emit analytics for component loads, button clicks, and validation errors.
- Log tool-call IDs with component telemetry for end-to-end tracing.
- Provide fallback behavior when components fail to load (for example, show structured JSON and offer a retry).

Once these plans are in place, move on to [Build a ChatGPT UI](https://developers.openai.com/apps-sdk/build/chatgpt-ui) for implementation.

## Next steps

If you're new to MCP, start with:

- [Model Context Protocol specification](https://modelcontextprotocol.io/specification)
- Official SDKs: [TypeScript SDK (official; includes FastMCP module)](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) for local debugging

Once comfortable with MCP primitives, move on to [Set up your server](https://developers.openai.com/apps-sdk/build/mcp-server) for implementation details.
