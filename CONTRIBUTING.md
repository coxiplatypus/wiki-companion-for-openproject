# Contributing

## Access Model

- You can open issues without write access.
- You can freely fork the project and work from your fork.
- Pull requests are restricted to approved contributors.
- Direct push access to this repository is by approval only.
- If you want contributor write access, request it from the repository owner/maintainer.
- If you do not know the maintainer personally, open an issue first to request contributor access before creating a pull request.

## Development Setup

```bash
npm install
npm run lint
npm run typecheck
npm run test:unit
```

For beginner local testing steps and Firefox artifact usage, see `docs/local-testing.md`.

## Branch and PR Guidelines

- Keep PRs focused and small.
- Include tests for behavioral changes.
- Do not introduce remote-code execution patterns.
- Keep permissions minimal and justify any new permission in the PR description.

## Keeping History Linear (Rebase Workflow)

The default branch is protected with linear-history rules. Update your feature branch with rebase before opening or updating a PR:

```bash
git fetch origin
git checkout <your-branch>
git rebase origin/main
```

If conflicts appear:

```bash
# edit files to resolve conflicts
git add <resolved-file>
git rebase --continue
```

After a successful rebase, update your remote branch:

```bash
git push --force-with-lease
```

Use `--force-with-lease` only on your own feature branch, never on `main`.

## Commit Message Style

Use clear, imperative subject lines, for example:

- `feat: improve wiki tree keep-open depth behavior`
- `fix: fail-safe when wiki TOC selectors are missing`

## Manual Validation Checklist

- Add/remove allowlisted origin in options page.
- Verify popup per-site toggles update behavior.
- Verify wiki TOC collapse keeps active branch visible.
- Verify `depth=1` vs `depth=2` changes wiki keep-open behavior as expected.
- Verify diagnostics only appear when selector mismatch happens.
