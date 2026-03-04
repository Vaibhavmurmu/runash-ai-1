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

## Research use cases

### Why start with use cases

Every successful Apps SDK app starts with a crisp understanding of what users are trying to accomplish. Discovery in ChatGPT is model-driven: the assistant chooses your app when tool metadata, descriptions, and past usage align with prompts and memories. That only works when the team has already mapped the tasks the model should recognize and the outcomes the app can deliver.

Use this section to capture hypotheses, pressure-test them with prompts, and align scope before defining tools or building components.

### Gather inputs

Begin with qualitative and quantitative research:

- **User interviews and support requests** – capture jobs-to-be-done, terminology, and data sources users rely on.
- **Prompt sampling** – list direct asks (for example, “show my Jira board”) and indirect intents (for example, “what am I blocked on for the launch?”) that should route to your app.
- **System constraints** – note compliance requirements, offline data dependencies, and rate limits that may influence tool design.

Document the persona, the context in which they reach for ChatGPT, and what success looks like in a single sentence per scenario.

### Define evaluation prompts

Decision-boundary tuning is easier with a golden prompt set. For each use case:

1. Author at least five direct prompts that explicitly reference your product, data, or expected verbs.
2. Draft five indirect prompts where users state a goal but not the tool (for example, “I need to keep our launch tasks organized”).
3. Add negative prompts that should **not** trigger your app so precision can be measured.

Use these prompts later in [Optimize metadata](https://developers.openai.com/apps-sdk/guides/optimize-metadata) to tune recall and precision without overfitting to one request.

### Scope the minimum lovable feature

For each use case decide:

- **What must be visible inline** to answer the question or enable action.
- **Which actions require write access** and whether developer-mode confirmation is required.
- **What state should persist** between turns (for example filters, selected rows, draft content).

Rank use cases by user impact and implementation effort. A common sequence is shipping one P0 scenario with a high-confidence component, then expanding to P1 scenarios after discovery data confirms engagement.

### Translate use cases into tooling

When a scenario is in scope, draft the tool contract:

- **Inputs** – parameters the model can provide safely; keep explicit, use enums for constrained sets, and document defaults.
- **Outputs** – structured content returned by the tool, including model-reasonable fields (IDs, timestamps, status) in addition to UI fields.
- **Component intent** – whether the experience is a read-only viewer, editor, or multiturn workspace. This drives [component planning](https://developers.openai.com/apps-sdk/plan/components) and storage design.

Review drafts with product, security, legal, and compliance stakeholders before implementation, especially for PII-sensitive integrations.

### Prepare for iteration

Even with strong planning, expect prompt and metadata iteration after first dogfood runs. Reserve time to:

- Rotate through the golden prompt set weekly and track tool-selection accuracy.
- Collect qualitative feedback from early testers in ChatGPT developer mode.
- Capture analytics (tool calls, component interactions) to measure adoption.

These research artifacts become foundational inputs to roadmap planning, changelogs, and success metrics once the app is live.

## Define tools

### Tool-first thinking

In Apps SDK, tools are the contract between your MCP server and the model. They describe what the connector can do, how to call it, and what data comes back. Good tool design makes discovery accurate, invocation reliable, and downstream UX predictable.

Use this checklist to turn use cases into well-scoped tools before implementing with an SDK.

### Draft the tool surface area

Start from the user journey defined in [use case research](https://developers.openai.com/apps-sdk/plan/use-case):

- **One job per tool** – keep each tool focused on one read or write action (for example, `fetch_board`, `create_ticket`) rather than a kitchen-sink endpoint.
- **Explicit inputs** – define `inputSchema` shape early, including parameter names, data types, enums, defaults, and nullable fields.
- **Predictable outputs** – enumerate structured fields returned by each tool, including machine-readable identifiers reusable in follow-up calls.

If read and write behaviors are both required, split them into separate tools so confirmation flows can be applied to write actions.

### Capture metadata for discovery

Discovery is driven primarily by metadata. For each tool, draft:

- **Name** – action-oriented and unique in your connector (for example, `kanban.move_task`).
- **Description** – one or two sentences that begin with “Use this when…” to clarify invocation conditions.
- **Parameter annotations** – describe each argument and call out valid ranges/enums to reduce malformed calls.
- **Global metadata** – define app-level name, icon, and descriptions for launcher/directory surfaces.

Then wire these into your MCP server and iterate with [Optimize metadata](https://developers.openai.com/apps-sdk/guides/optimize-metadata).

### Model-side guardrails

Define expected model behavior once tools are linked:

- **Prelinked vs. link-required** – if anonymous usage is supported, expose tools without auth; otherwise enforce account linking through the [Authentication](https://developers.openai.com/apps-sdk/build/auth) flow.
- **Read-only hints** – use [`readOnlyHint` annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations) for tools that never mutate state.
- **Destructive hints** – use [`destructiveHint` annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations) for delete/overwrite actions.
- **Open-world hints** – use [`openWorldHint` annotations](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations) for tools that publish content or interact beyond the user account.
- **Result components** – decide per tool whether to return JSON only, a rendered component, or both. Set `_meta.ui.resourceUri` on tool descriptors; for compatibility, ChatGPT also honors `_meta["openai/outputTemplate"]`.

### Golden prompt rehearsal

Before implementation, validate planned tools against your prompt set:

1. For each direct prompt, confirm exactly one clearly matching tool exists.
2. For indirect prompts, ensure descriptions provide enough context to route to your connector over built-in alternatives.
3. For negative prompts, verify metadata keeps tools hidden unless users explicitly opt in (for example by naming your product).

Capture ambiguities and adjust metadata now; this is cheaper than post-launch refactoring.

### Handoff to implementation

Before coding, compile a handoff with:

- Tool name, description, input schema, and output schema.
- Whether each tool returns a component, and which component should render.
- Auth requirements, rate limits, and error-handling expectations.
- Prompt cases expected to succeed and expected to fail.

Then move into [Set up your server](https://developers.openai.com/apps-sdk/build/mcp-server) to implement with your chosen MCP SDK.

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

## MCP Apps compatibility in RunAshChat (ChatGPT-style)

### Overview

ChatGPT supports the [**MCP Apps**](https://modelcontextprotocol.io/docs/extensions/apps) open standard for embedded app UIs.

MCP Apps UIs run inside an iframe and communicate with the host over a standard bridge (`ui/*` JSON-RPC over `postMessage`). ChatGPT implements this same iframe-and-bridge model, so you can build your UI once and run it in ChatGPT and other MCP Apps-compatible hosts.

Existing Apps SDK APIs remain supported, and new experimental capabilities typically ship first in the Apps SDK. OpenAI helped shape the MCP Apps standard from ChatGPT Apps, and capabilities can move into the MCP spec after validation of shape and behavior.

Build with MCP Apps standard keys and bridge methods by default. Use `window.openai` when you need ChatGPT-specific capabilities.

### Recommended approach

For new apps (and new UI surfaces inside existing apps), start with the MCP Apps standard:

1. **Declare your UI** using `_meta.ui.resourceUri`.
2. **Use the standard host bridge** (`ui/*` JSON-RPC over `postMessage`) for initialization, notifications, and host interaction.

Optional:

3. **Layer on ChatGPT extensions** via `window.openai` only when needed for capabilities not yet covered by the shared spec.

#### MCP Apps host bridge (`ui/*`)

MCP Apps defines a standard iframe bridge:

- **Transport:** JSON-RPC 2.0 messages over `window.postMessage`
- **Namespace:** `ui/*` methods and notifications for UI ↔ host interaction
- **Tool calls:** use MCP tool surface methods (for example, `tools/call`) rather than host-specific UI globals

### How this relates to the Apps SDK

The Apps SDK is a supported way to build and distribute ChatGPT Apps. ChatGPT also implements the MCP Apps UI standard, so your UI can run across MCP Apps-compatible hosts.

In practice:

- Use MCP Apps standard keys and bridge methods (`_meta.ui.resourceUri`, `ui/*`) when equivalent behavior exists.
- Use OpenAI extensions only when needed for ChatGPT-specific capabilities.

This is similar to the web platform: vendor-specific APIs can help ship early, but once a standard exists, docs should lead with the standard form. This improves portability without implying deprecation.

### Optional ChatGPT extensions via `window.openai`

Some capabilities are specific to ChatGPT. Treat them as optional extensions that add value in ChatGPT without preventing compatibility in other MCP Apps hosts.

Examples include:

- Instant Checkout (`window.openai.requestCheckout`)
- File uploads (`window.openai.uploadFile`, `window.openai.getFileDownloadUrl`)
- Host modals (`window.openai.requestModal`)

### Migration and mapping guide

This maps common Apps SDK patterns to MCP Apps standard equivalents.

#### Tool metadata

| Goal | MCP Apps standard | ChatGPT compatibility alias |
| --- | --- | --- |
| Link a tool to a UI resource | `_meta.ui.resourceUri` | `_meta["openai/outputTemplate"]` |

#### Host bridge

| Goal | MCP Apps standard | ChatGPT extension (optional) |
| --- | --- | --- |
| Receive tool input | `ui/initialize` + `ui/notifications/tool-input` | `window.openai.toolInput` |
| Receive tool results | `ui/notifications/tool-result` | `window.openai.toolOutput` |
| Call a tool from the UI | `tools/call` | `window.openai.callTool` |
| Send a follow-up message | `ui/message` | `window.openai.sendFollowUpMessage` |
| Update model-visible UI context | `ui/update-model-context` | `window.openai.setWidgetState` |

Build around MCP Apps standards for portability, then layer ChatGPT extensions where they improve the ChatGPT UX.

### Extension best practices

- **Feature-detect** before calling an extension.
- **Gracefully degrade** when an extension is unavailable.

```js
const openai = typeof window !== "undefined" ? window.openai : undefined;

if (openai?.requestModal) {
  await openai.requestModal({
    // ...
  });
} else {
  // Fallback behavior for hosts without this extension.
}
```

## Next steps

If you're new to MCP, start with:

- [Model Context Protocol specification](https://modelcontextprotocol.io/specification)
- Official SDKs: [TypeScript SDK (official; includes FastMCP module)](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) for local debugging

Once comfortable with MCP primitives, move on to [Set up your server](https://developers.openai.com/apps-sdk/build/mcp-server) for implementation details.
