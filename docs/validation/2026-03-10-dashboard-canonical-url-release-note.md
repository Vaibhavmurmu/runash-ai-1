# Release note: dashboard canonical URL alignment (2026-03-10)

## Summary
User-visible dashboard workspace URLs are now standardized to canonical routes:

- **Editor:** `/editor`
- **RunAsh Chat:** `/runashchat`

## Redirect behavior
The following legacy URLs remain supported via permanent redirects:

- `/dashboard/editor` → `/editor`
- `/dashboard/chat` → `/runashchat`
- `/dashboard/runash-chat` → `/runashchat`
- `/chat` → `/runashchat`
- `/runash-chat` → `/runashchat`

## User impact

- Existing bookmarks to legacy chat/editor routes continue to work.
- Address bar URLs normalize to the canonical routes after navigation.
- Documentation and route-audit notes now reflect the long-term deprecation posture for legacy links.
