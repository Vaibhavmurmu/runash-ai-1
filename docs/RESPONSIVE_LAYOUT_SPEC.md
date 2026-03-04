# Responsive Layout Spec (Sidebar, Navigation, Grids, Dialogs, Tables, Editor/Streaming)

## Purpose

Define shared breakpoint behavior and interaction requirements for major RunAsh UI surfaces so responsive behavior remains consistent and accessible across devices.

## Breakpoint tiers

| Tier | Width range | Typical device | Notes |
| --- | --- | --- | --- |
| Small mobile | `320-374px` | Compact phones | Prioritize single-column flows and overlays. |
| Large mobile | `375-767px` | Modern phones | Keep touch controls in thumb zones; avoid horizontal scroll. |
| Tablet portrait | `768-1023px` | Tablet portrait / foldable narrow | Allow compact side rails and overflow actions. |
| Tablet landscape | `1024-1279px` | Tablet landscape / small laptop | Enable pinned utility panels when space allows. |
| Desktop | `1280-1919px` | Laptops + desktop monitors | Default to full navigation and multi-column layouts. |
| Ultrawide | `>=1920px` | Large desktop monitors | Cap content width and avoid excessive scan distance. |

## Component behavior by breakpoint

### 1) Sidebar modes (collapsed, overlay, pinned)

| Tier | Sidebar behavior |
| --- | --- |
| Small + large mobile | **Overlay only**. Hidden by default; opens as modal sheet with backdrop. Dismiss on route change and `Esc`. |
| Tablet portrait | **Collapsed rail + overlay detail**. Icon rail can remain visible; expanded nav opens as overlay drawer. |
| Tablet landscape | **Collapsed or pinned** depending on route density. Persist collapsed rail; allow user toggle to pinned panel. |
| Desktop + ultrawide | **Pinned default** with optional collapse. Preserve active-state visibility and keyboard reachability. |

Implementation constraints:
- Overlay sidebars must trap focus while open and restore focus to trigger on close.
- Collapsed rails must keep visible tooltip/label affordances for keyboard and screen reader users.
- Pinned sidebars must not create double scrollbars; content area owns vertical scrolling.

### 2) Navbar action overflow

| Tier | Navbar behavior |
| --- | --- |
| Small mobile | Keep only primary action + menu trigger visible; move secondary actions into overflow menu. |
| Large mobile | Keep at most 2 high-priority actions visible before overflow. |
| Tablet portrait | Show key actions; move low-frequency actions to overflow/dropdown. |
| Tablet landscape+ | Show full action set where space permits; retain overflow for optional/rare actions. |

Implementation constraints:
- Overflow menu must be keyboard operable (`Tab`, arrow keys, `Esc`) and screen-reader labeled.
- Action order in overflow should match desktop visual/action priority.

### 3) Card grids

| Tier | Grid behavior |
| --- | --- |
| Small mobile | 1 column. |
| Large mobile | 1-2 columns depending on minimum card width. |
| Tablet portrait | 2 columns default. |
| Tablet landscape | 2-3 columns. |
| Desktop | 3-4 columns. |
| Ultrawide | 4-6 columns with max content width guardrails. |

Implementation constraints:
- Maintain minimum card width (`>= 240px`) and consistent card heights where practical.
- Avoid masonry-only layouts for critical workflows to keep scan order predictable.

### 4) Dialogs and sheets

| Tier | Dialog behavior |
| --- | --- |
| Small + large mobile | Prefer full-height bottom sheet/full-screen dialog. |
| Tablet portrait | Large sheet or centered dialog with roomy margins. |
| Tablet landscape+ | Centered dialog with capped width and `max-height` scroll region. |

Implementation constraints:
- Keep close controls reachable with touch (`>=44x44px`) and keyboard.
- Dialog content must provide an internal scroll region when content exceeds viewport height.
- Sticky dialog header/footer should remain visible during scroll for long forms.

### 5) Data tables

| Tier | Table behavior |
| --- | --- |
| Small + large mobile | Convert dense tables to stacked cards or horizontally scrollable region with pinned key column where needed. |
| Tablet portrait | Allow horizontal scroll with sticky header + first column for key identifiers. |
| Tablet landscape+ | Full table view with sticky header and optional sticky action column. |

Implementation constraints:
- Never clip actionable controls out of view without keyboard-accessible path.
- Horizontal scroll regions must show clear affordance and preserve row association semantics.

### 6) Editor and streaming panels

| Tier | Editor/streaming behavior |
| --- | --- |
| Small mobile | Canvas/preview prioritized; tools and chat in overlays/drawers. Bottom bar contains primary transport controls only. |
| Large mobile | Same as small mobile with improved quick-action density. |
| Tablet portrait | Compact left tool rail + overlay right panel/chat. |
| Tablet landscape | Persistent left rail, optional pinned right panel, collapsible chat. |
| Desktop + ultrawide | Persistent dual-panel layout with resize handles and independent scroll regions. |

Implementation constraints:
- Streaming stats and moderation/chat panels must remain reachable without obscuring primary preview.
- Reserve consistent keyboard shortcuts across panel states.
- Avoid nested scroll traps: timeline, inspector, and chat should each have clear boundaries.

## Accessibility and usability baseline (all breakpoints)

### Touch targets and spacing
- Interactive targets: minimum `44x44px` (prefer `48x48px` for high-frequency actions).
- Adjacent tap targets: at least `8px` separation where possible.

### Scroll regions and sticky UI
- Exactly one primary vertical scroll container per surface.
- Sticky headers/toolbars must not cover focused elements when users tab through controls.
- When nested scroll is required (e.g., chat panel), add clear visual containment and keyboard escape path.

### Keyboard navigation
- All nav, overflow menus, sidebars, dialogs, and tables must be operable without pointer input.
- Ensure visible focus state in light/dark themes and across sticky/overlay contexts.
- Preserve logical tab order when switching between collapsed, overlay, and pinned panel modes.

## Layout validation checklist (required)

Run checks at the following representative widths:
- **Small mobile:** `320x700`
- **Large mobile:** `430x932`
- **Tablet portrait:** `768x1024`
- **Tablet landscape:** `1024x768`
- **Desktop:** `1366x768`
- **Ultrawide:** `1920x1080` (and optionally `2560x1440`)

Checklist per viewport:
- [ ] Sidebar mode matches spec (collapsed/overlay/pinned) and is keyboard accessible.
- [ ] Navbar actions collapse into overflow without clipping or overlap.
- [ ] Card grids maintain minimum card width and predictable reading order.
- [ ] Dialogs/sheets fit viewport with reachable close action and internal scroll.
- [ ] Tables remain readable (stack/scroll mode as designed), sticky headers remain usable.
- [ ] Editor/streaming panels preserve preview/canvas priority and panel reachability.
- [ ] Touch targets meet minimum size; no crowded critical controls.
- [ ] Sticky headers/toolbars do not hide focused fields or action buttons.
- [ ] `Tab` / `Shift+Tab` / `Esc` behavior works across overlays, menus, and dialogs.

## Suggested validation commands

Use these commands before shipping responsive changes:

- `npm run lint`
- `npm run build`

When modifying visual behavior, include viewport screenshots or recorded checks in PR notes.
