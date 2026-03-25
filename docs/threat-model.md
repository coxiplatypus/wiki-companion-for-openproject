# Threat Model

## Assets

- Local config and state in extension storage.
- User browsing context on allowlisted OpenProject origins.

## Trust Boundaries

- Extension pages (trusted runtime UI).
- Background service worker (trusted orchestrator).
- OpenProject pages (untrusted DOM environment).

## Primary Risks and Mitigations

- DOM selector drift:
  - Mitigation: fail-safe no-op with diagnostics.
- Over-broad host access:
  - Mitigation: optional host permissions + explicit allowlist.
- Accidental data collection:
  - Mitigation: no telemetry in v1, local-only storage.
- Script injection abuse:
  - Mitigation: no remote code loading.

## Out of Scope (v1)

- Cloud synchronization of settings.
- Server-side logging.
- Non-OpenProject site adaptations.
