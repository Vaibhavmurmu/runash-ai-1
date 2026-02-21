# Editor UI Architecture Note (Responsive + Accessible)

## Layout strategy

The editor now follows a mobile-first layout and progressively enhances at larger breakpoints:

- **< 768px (mobile):**
  - Tooling switches to icon-first quick actions + a left sheet drawer.
  - Model/settings controls move to a right sheet drawer.
  - Bottom toolbar uses touch-sized controls and an overflow menu for secondary actions.
- **768px - 1023px (tablet):**
  - Left rail appears in compact mode.
  - Right panel remains drawer-driven to preserve canvas space.
- **>= 1024px (desktop):**
  - Left rail and right side panel render persistently.
  - Right panel widths scale at `w-80`, `xl:w-96`, and `2xl:w-[28rem]`.

## Interaction patterns

- **Compact icon mode:** Primary actions stay reachable in thumb zone on mobile.
- **Overflow actions:** Secondary actions (duplicate/share/export/delete/save/collab) are consolidated in dropdown menus.
- **Touch-friendly timeline controls:** 40px+ target buttons with scrubber input are used in the bottom toolbar.

## Accessibility updates

- Added `aria-label` and semantic landmarks for tools, action groups, and side panels.
- Added focus management:
  - Chat input auto-focuses when chat opens.
  - Collaboration close button receives initial focus.
- Added **Escape-to-close** behavior for chat and collaboration overlays.
- Preserved keyboard-first tab order by grouping controls logically (header actions, panel actions, timeline controls).

## Width validation matrix

Validated behavior against common viewport widths:

- **320 / 375:** quick-action bar + drawers prevent canvas squeeze.
- **768:** compact left rail present, drawers still used for right-side controls.
- **1024:** desktop split layout activates with persistent sidebars.
- **1440:** expanded right panel width and comfortable spacing for dense controls.
