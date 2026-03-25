# Architecture

## Runtime Overview

The extension is split into four subsystems:

- Background service worker: owns config updates, optional host permissions, and dynamic content-script registration.
- Content bootstrap: initializes feature modules only on allowlisted origins that look like OpenProject pages.
- Feature modules:
  - Wiki TOC auto-collapse with relative keep-open depth.
- UI surfaces:
  - Options page for allowlist and global defaults.
  - Popup for per-site quick toggles and quick global wiki depth adjustment.

## Data Model

Configuration is versioned (`configVersion`) and stored in `storage.local`.

Primary keys:

- `allowedOrigins`: user-controlled origin allowlist.
- `features`: global defaults.
- `siteOverrides`: per-origin feature overrides.
- `wikiToc`: collapse settings (`depth`, scope).
- `diagnostics.enabled`: enables local diagnostics notices.

## Data Flow

1. User changes settings in options/popup.
2. Message is sent to background service worker.
3. Service worker persists migrated config and syncs dynamic content-script registrations.
4. Content scripts refresh on config change via storage/message hooks.
5. Feature modules apply behavior and fail safe on selector mismatch.

## Wiki Apply Model

- Wiki TOC auto-collapse runs on navigation/refresh cycles.
- A short bounded bootstrap window is used to catch lazy wiki tree rendering.
- The feature does not continuously re-apply on every DOM mutation, so manual branch expansion can be preserved during the current page session.
- `wikiToc.depth` is interpreted relative to the detected wiki tree root.

## Fail-Safe Behavior

- If required selectors are missing, extension logic for that feature is paused on that page.
- A small local notice is shown when diagnostics are enabled.
- No destructive mutation is attempted after selector mismatch.
