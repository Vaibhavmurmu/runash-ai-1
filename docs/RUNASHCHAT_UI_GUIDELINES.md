# RunAshChat UI Guidelines for ChatGPT App Experiences

## Overview

Apps are developer-built experiences available in ChatGPT. They extend what users can do without breaking the flow of conversation, appearing through lightweight cards, carousels, fullscreen views, and other display modes that integrate seamlessly into ChatGPT’s interface.

Before designing your app visually, review the [UX principles](https://developers.openai.com/apps-sdk/concepts/ux-principles).

![Example apps in the ChatGPT mobile interface](https://developers.openai.com/images/apps-sdk/overview.png)

## Design system

To design high-quality apps that feel native to ChatGPT, use the [Apps SDK UI](https://openai.github.io/apps-sdk-ui/) design system.

It provides styling foundations with Tailwind, CSS variable design tokens, and a library of accessible components.

Using Apps SDK UI is optional, but it can make development faster and more consistent with ChatGPT patterns.

Before code, start with the [Figma component library](https://www.figma.com/community/file/1560064615791108827/apps-in-chatgpt-components-templates).

## Display modes

Display modes are surfaces for app experiences in ChatGPT, each suited to a different interaction depth.

### Inline

Inline appears directly in the conversation flow, currently before the model response. Every app initially appears inline.

![Examples of inline cards and carousels in ChatGPT](https://developers.openai.com/images/apps-sdk/inline_display_mode.png)

#### Layout

- **Icon & tool call**: App name and icon label.
- **Inline display**: Lightweight app content above model response.
- **Follow-up**: Short model-generated suggestion after the widget; avoid redundant content.

### Inline card

Single-purpose widgets embedded in conversation for quick confirmations, simple actions, or compact visuals.

![Examples of inline cards](https://developers.openai.com/images/apps-sdk/inline_cards.png)

#### When to use

- Single action/decision (for example, confirming a booking).
- Small structured data (for example, map, order summary, status).
- Self-contained widget or tool.

#### Layout

![Diagram of inline cards](https://developers.openai.com/images/apps-sdk/inline_card_layout.png)

- **Title**: Use when card content has a parent document/item group.
- **Expand**: Open fullscreen for rich media or interactive elements.
- **Show more**: Reveal additional items where needed.
- **Edit controls**: Enable inline adjustments without clutter.
- **Primary actions**: Maximum two actions at the bottom (conversation turn or tool call).

#### Interaction

![Diagram of interaction patterns for inline cards](https://developers.openai.com/images/apps-sdk/inline_card_interaction.png)

- **States**: Persist user edits.
- **Simple direct edits**: Allow lightweight inline edits where appropriate.
- **Dynamic layout**: Expand card height up to mobile viewport height.

#### Rules of thumb

- Limit to **two primary actions max**.
- Avoid deep navigation, tabs, or nested views.
- Avoid nested scrolling.
- Do not duplicate ChatGPT inputs/system features.

![Examples of patterns to avoid in inline cards](https://developers.openai.com/images/apps-sdk/inline_card_rules.png)

### Inline carousel

A row of cards for quick side-by-side scanning and selection.

![Example of inline carousel](https://developers.openai.com/images/apps-sdk/inline_carousel.png)

#### When to use

- Small list of similar options (restaurants, playlists, events).
- Visual items requiring more metadata than simple rows.

#### Layout

![Diagram of inline carousel](https://developers.openai.com/images/apps-sdk/inline_carousel_layout.png)

- **Image**: Always include a visual.
- **Title**: Usually required for context.
- **Metadata**: Keep to key details (about two lines).
- **Badge**: Optional supporting context.
- **Actions**: Prefer one clear CTA per item.

#### Rules of thumb

- Keep **3–8 items** for scannability.
- Keep metadata concise (three lines max).
- Use one optional CTA per card.
- Maintain consistent hierarchy across cards.

### Fullscreen

Immersive mode for richer tasks that do not fit in a single card. The ChatGPT composer remains available for conversational follow-up.

![Example of fullscreen](https://developers.openai.com/images/apps-sdk/fullscreen.png)

#### When to use

- Rich tasks (maps, editing canvases, interactive diagrams).
- Browsing detailed content.

#### Layout

![Diagram of fullscreen](https://developers.openai.com/images/apps-sdk/fullscreen_layout.png)

- **System close**: Closes sheet/view.
- **Fullscreen view**: Main content area.
- **Composer**: Native ChatGPT composer for continued interaction.

#### Interaction

![Interaction patterns for fullscreen](https://developers.openai.com/images/apps-sdk/fullscreen_interaction_a.png)

- **Chat sheet**: Keep conversation context available.
- **Thinking**: Composer shimmer during streaming.
- **Response snippet**: Truncated model snippet above composer after completion.

#### Rules of thumb

- Design around the always-present system composer.
- Use fullscreen to deepen engagement, not replicate full native apps.

### Picture-in-picture (PiP)

A persistent floating window for ongoing/live sessions while conversation continues.

![Example of picture-in-picture](https://developers.openai.com/images/apps-sdk/pip.png)

#### When to use

- Parallel activities (game, live collaboration, quiz, learning).
- Widgets that react to user prompts in-chat.

#### Interaction

![Interaction patterns for picture-in-picture](https://developers.openai.com/images/apps-sdk/fullscreen_interaction.png)

- **Activated**: On scroll, PiP stays pinned to viewport top.
- **Pinned**: Persists until dismissed or session end.
- **Session ends**: Returns inline and scrolls away.

#### Rules of thumb

- Ensure PiP can update from chat interactions.
- Close PiP automatically at session end.
- Avoid overloading PiP with controls or static content.

## Visual design guidelines

Consistency improves clarity and trust while still allowing brand expression.

### Color

Use system-defined palettes for consistency. Add brand via accents/icons/imagery, not structural overrides.

![Color palette](https://developers.openai.com/images/apps-sdk/color.png)

#### Rules of thumb

- Use system colors for text/icons/spatial elements.
- Keep brand accents from overriding core backgrounds/text.
- Avoid custom gradients/patterns that break platform look.
- Brand accents are acceptable on primary buttons within app surfaces.

![Example color usage](https://developers.openai.com/images/apps-sdk/color_usage_1.png)

_Use brand colors on accents and badges. Do not change text colors or core component styles._

![Example color usage](https://developers.openai.com/images/apps-sdk/color_usage_2.png)

_Do not apply colors to text-area backgrounds._

### Typography

Use platform-native system fonts (SF Pro on iOS, Roboto on Android) for readability and accessibility.

![Typography](https://developers.openai.com/images/apps-sdk/typography.png)

#### Rules of thumb

- Inherit system font stack and sizing.
- Use partner emphasis styles only in content areas.
- Limit font-size variation; prefer body and body-small.

![Example typography](https://developers.openai.com/images/apps-sdk/typography_usage.png)

_Do not use custom fonts, including fullscreen._

### Spacing & layout

Consistent spacing and alignment preserve scannability.

![Spacing & layout](https://developers.openai.com/images/apps-sdk/spacing.png)

#### Rules of thumb

- Use system grid spacing.
- Keep padding consistent; avoid edge-to-edge text blocks.
- Respect system corner radii where possible.
- Keep headline/supporting text/CTA hierarchy clear.

### Icons & imagery

Use iconography and imagery that align with ChatGPT’s visual language.

![Icons](https://developers.openai.com/images/apps-sdk/icons.png)

#### Rules of thumb

- Use system icons or compatible monochrome outlined iconography.
- Do not embed your logo in response content (ChatGPT already appends app name/logo).
- Follow enforced image aspect ratios.

![Icons & imagery](https://developers.openai.com/images/apps-sdk/iconography.png)

### Accessibility

Accessibility is a core requirement for partner app experiences.

#### Rules of thumb

- Maintain minimum WCAG AA text/background contrast.
- Provide alt text for all images.
- Support text resizing without layout breakage.
