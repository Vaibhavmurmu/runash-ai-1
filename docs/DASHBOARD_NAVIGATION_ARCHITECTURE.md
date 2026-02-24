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
  - `/runash-chat`
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
- **Rollback plan:** revert to the previous dashboard nav config and sidebar mapping commit if post-merge route mismatches are found, then run smoke checks for `/dashboard`, `/seller/dashboard`, `/ecommerce/dashboard`, and `/runash-chat` before reattempting rollout.
