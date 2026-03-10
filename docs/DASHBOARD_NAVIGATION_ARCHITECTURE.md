# Dashboard Navigation Architecture

## Purpose

This document defines the current dashboard navigation structure and replaces references to the legacy sidebar-per-page structure.

## Source of truth

- Primary nav items: `components/dashboard/dashboard-nav-config.ts`
- Sidebar rendering + route availability guards: `components/dashboard/dashboard-sidebar.tsx`
- Deprecated compatibility exports:
  - `components/dashboard/shell/nav-config.ts`
  - `components/dashboard/shell/sidebar.tsx`

## Navigation structure

The dashboard sidebar uses sectioned navigation with shared active-path matching and optional route guards:

- **Core**
  - `/dashboard`
- **Studio**
  - `/stream`
  - `/schedule`
  - `/upload`
  - `/recordings`
  - `/editor`
- **Intelligence**
  - `/agents/dashboard`
  - `/automation`
  - `/runashchat`
- **Operations**
  - `/analytics`
  - `/alerts`
  - `/seller/dashboard`
  - `/ecommerce/dashboard`
- **Account**
  - `/settings`

## Legacy sidebar migration note

Legacy, route-local sidebar lists should not be reintroduced for dashboard surfaces. Any route addition or rename should be made in `dashboard-nav-config.ts` first, then validated against `dashboard-sidebar.tsx` route guard behavior.

## Risk and rollback

- **Risk:** route mismatches can leave users with broken nav destinations or incorrect active-state highlighting.
- **Rollback plan:** revert to the previous dashboard nav config and sidebar mapping commit if post-merge route mismatches are found, then run smoke checks for `/dashboard`, `/seller/dashboard`, `/ecommerce/dashboard`, and `/dashboard/chat` before reattempting rollout.


## Legacy route redirects

Canonical dashboard workspace routes are:

- **Editor:** `/editor`
- **RunAsh Chat:** `/runashchat`

Legacy entry points remain permanently redirected for backward compatibility.


## Canonical chat route mapping

- Canonical product label: **RunAsh Chat**
- Canonical route: `/runashchat`
- Legacy compatibility routes (permanent redirect): `/chat`, `/runash-chat`, `/dashboard/runash-chat`, `/dashboard/chat`

## Legacy Redirect Matrix

| Legacy path | Permanent redirect target | Notes |
| --- | --- | --- |
| `/dashboard/chat` | `/runashchat` | Old dashboard chat route retained as compatibility alias. |
| `/dashboard/runash-chat` | `/runashchat` | Previous product-named dashboard path. |
| `/chat` | `/runashchat` | Historic global chat entry point. |
| `/runash-chat` | `/runashchat` | Historic hyphenated product path. |
| `/dashboard/editor` | `/editor` | Prior dashboard editor entry point. |
