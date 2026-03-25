# Local Testing (Beginner Guide)

If you are new to extension development, start here.

## 1) Build a Firefox Test Artifact

Run these commands in the project root:

```bash
npm install
npm run package:firefox
```

This creates:

- `artifacts/wiki-companion-for-openproject-firefox-v<version>.zip`

## 2) Test It Temporarily in Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on...`.
3. Select the generated artifact from `artifacts/`.
4. Open the extension popup and add your OpenProject URL to the allowlist.
5. Reload your OpenProject page and verify behavior.

Important:

- Temporary add-ons are removed when Firefox fully restarts.
- Rebuild and reload after changes.

## 3) What You Can Test Manually

- Wiki TOC auto-collapse keeps the active branch open.
- Per-site toggles in popup work as expected.
- Unknown selectors fail safely and do not break the page.

## 3a) Depth Troubleshooting

- Set `Wiki tree keep-open depth` to `1` and reload/navigate inside wiki:
  - expected: only top-level branch context is kept open by default.
- Set depth to `2` and reload/navigate again:
  - expected: top-level plus one deeper level are kept open by default.
- Wrapper list items outside the real OpenProject wiki tree should no longer inflate perceived depth:
  - expected: depth behavior stays consistent even if layout wrappers are present.
- If depth appears too aggressive, verify you are testing after a reload/navigation cycle (not only after manual expansion without navigation).

## 4) What the Firefox Upload Artifact Is For

The artifact ZIP is useful for:

- Uploading to AMO (for publishing).
- Creating an unlisted/signed distribution flow for private testing teams.
- Attaching a build to release pipelines and QA handoff.

## 5) Persistent Installation Note

For persistent installation in Firefox, use a signed add-on package (for example through AMO distribution).  
The temporary debugging install is best for local development and quick checks.

## 6) Optional Automated Tests

Static + unit checks:

```bash
npm run lint
npm run typecheck
npm run test:unit
```

Playwright fixture tests:

```bash
PLAYWRIGHT_BROWSERS_PATH=.playwright npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=.playwright npm run test:e2e
```
