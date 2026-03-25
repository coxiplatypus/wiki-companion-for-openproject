# Wiki Companion for OpenProject

> Disclaimer: This repository includes code generated with LLM assistance and reviewed/edited by maintainers before release.

Firefox-first WebExtension that keeps the OpenProject wiki tree focused by auto-collapsing non-active branches with predictable keep-open depth.

## Firefox Add-ons (AMO) Listing Page

- Placeholder: `https://addons.mozilla.org/firefox/addon/wiki-companion-for-openproject/`
- Replace this placeholder with your final live listing URL if AMO assigns a different slug.

## Quick Start

```bash
npm install
npm run lint
npm run typecheck
npm run test:unit
npm run package:firefox
```

Packaged artifact:

- `artifacts/wiki-companion-for-openproject-firefox-v<version>.zip`

## Local-Only Files

- Use `.local/` for anything private or machine-specific.
- `.local/` is ignored by Git and will not be pushed.
- Move common generated folders into `.local/` with:

```bash
npm run stash:local
```

- Remove local-only folder entirely before pushing if you want a clean workspace:
  - `npm run clean:local`

## Current Release Scope

- Firefox publication target with AMO-ready packaging.
- Origin allowlist + optional host-permission flow.
- Wiki TOC auto-collapse with navigation-cycle apply model.
- Safe diagnostics notice when wiki selectors are not recognized.
- Chromium/Safari notes are documented as future support.

## Notable Defaults

- `features.wikiTocAutoCollapse = true`
- `wikiToc.depth = 2`
- `wikiToc.scope = "wiki_toc_only"`
- `diagnostics.enabled = true`

## Settings Explained

- `Wiki TOC auto-collapse`: collapses non-active wiki branches and preserves the active branch.
- `Wiki tree keep-open depth`: global keep-open depth (`1` = top-level only, `2` = top-level + one deeper level).
- `Show diagnostics notice when selectors break`: shows a local notice when layout selectors drift.

## Documentation Index

### Project Docs

- [Architecture](docs/architecture.md)
- [Local Testing](docs/local-testing.md)
- [Publishing: Firefox (AMO)](docs/publishing-firefox.md)
- [Future Support: Chrome](docs/publishing-chrome.md)
- [Future Support: Safari](docs/publishing-safari.md)
- [Compatibility Matrix](docs/compatibility-matrix.md)
- [Threat Model](docs/threat-model.md)

### Root Policies and Community Docs

- [Contributing](CONTRIBUTING.md)
- [Privacy Notice](PRIVACY.md)
- [Disclaimer](DISCLAIMER.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [License (Apache-2.0)](LICENSE)
- [Notice](NOTICE)

## Repository File Structure

```text
.
├── .github/
│   └── workflows/
├── docs/
├── manifests/
├── scripts/
├── src/
│   ├── background/
│   ├── content/
│   ├── shared/
│   └── ui/
│       ├── options/
│       └── popup/
├── tests/
│   ├── e2e/
│   └── unit/
├── CONTRIBUTING.md
├── DISCLAIMER.md
├── LICENSE
├── NOTICE
├── PRIVACY.md
├── README.md
└── CODE_OF_CONDUCT.md
```

## Compliance and Safety Posture

- No remote code loading.
- No telemetry.
- Minimal permissions plus optional host permissions for allowed origins.
- Not affiliated with the OpenProject Foundation.

## Contribution Access Policy

- Anyone can open issues and fork this repository.
- Pull requests are restricted to approved contributors.
- Direct push access to this repository is restricted.
- If you do not know the maintainer personally, open an issue to request contributor access first.
