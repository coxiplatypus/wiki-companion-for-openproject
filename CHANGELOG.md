# Changelog

All notable changes to this project are documented in this file.

## [0.2.1] - 2026-03-28

- Fixed Firefox AMO manifest compatibility warnings by separating browser-specific background manifest keys.
- Removed Firefox `gecko.data_collection_permissions` to keep compatibility aligned with `strict_min_version: 128.0`.
- Added an automated Firefox manifest validation guard to prevent warning regressions in local packaging and CI.
- No runtime feature changes; this is a packaging and publication-readiness patch release.
