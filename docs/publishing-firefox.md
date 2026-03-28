# Publishing: Firefox Add-ons (AMO)

This project is currently shipped Firefox-first.

## 1) Build Submission Artifact

```bash
npm run package:firefox
```

The packaging command includes a Firefox manifest guard (`npm run validate:manifest:firefox`) before ZIP creation.

Expected output:

- `artifacts/wiki-companion-for-openproject-firefox-v<version>.zip`

## 2) AMO Listing Inputs

Prepare these before submission:

- Add-on name: `Wiki Companion for OpenProject`
- Short summary and detailed description
- Category, screenshots, and icon assets
- Privacy details consistent with `PRIVACY.md`
- Non-affiliation wording consistent with `DISCLAIMER.md`
- Data collection declaration: set Firefox built-in consent to no data collection
  - `browser_specific_settings.gecko.data_collection_permissions.required = ["none"]`
- Platform target for this release: Firefox desktop only (leave Firefox for Android unchecked)

README contains a placeholder for the future public listing URL:

- `Firefox Add-ons (AMO) listing page`
- `https://addons.mozilla.org/firefox/addon/wiki-companion-for-openproject/`

Replace this URL if AMO assigns a different final listing slug.

## 3) Permission Justification Guidance

Document why each permission is required in AMO listing notes:

- `storage`: stores local configuration and per-origin settings.
- `tabs`: reads current tab URL in popup to detect current origin.
- `scripting`: registers content script only for allowlisted origins.
- optional host permissions (`http://*/*`, `https://*/*`): requested per origin when user explicitly allows a site.

## 4) Submission Checklist

- Run lint, typecheck, and unit tests before upload.
- Ensure Firefox manifest guard passes (`npm run validate:manifest:firefox`) on the built artifact.
- Confirm manifest includes Firefox built-in data consent:
  - `gecko.data_collection_permissions.required = ["none"]`
  - `gecko.strict_min_version = "140.0"`
- Select Firefox desktop only in AMO platform compatibility for this release.
- Confirm manifest version/name/description and extension id are correct.
- Verify no remote code loading and no telemetry.
- Verify only intended OpenProject wiki behavior is present.
- Confirm AMO validator reports no warnings for the submission ZIP.
- Upload ZIP to AMO and address reviewer feedback.

## 5) Post-Publish Checks

- Install from AMO listing and verify allowlist flow.
- Verify wiki auto-collapse + keep-open depth behavior on a real OpenProject site.
- Verify diagnostics notice still appears safely on selector mismatch.
- Tag the release and update release notes.
