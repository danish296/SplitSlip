# Contributing to SplitSlip

Thanks for looking. Bug reports, fixes and features are all welcome.

## Getting set up

See [Quick start](README.md#quick-start) in the README. Short version:

```bash
bun install
cp .env.example .env.local
bunx convex dev      # terminal 1 — provisions your dev backend
bun run dev          # terminal 2
```

You need your own free [Convex](https://convex.dev) deployment. The first
`convex dev` run creates it and generates `src/convex/_generated/`, which is not
in the repo.

## Before you write code

Read [docs/CONVENTIONS.md](docs/CONVENTIONS.md). It's short, and most of it exists
because breaking it causes a specific bug. The parts that matter most:

- **Money is never a float.** Integer paise everywhere, `*Minor` suffix, and
  splits must reconcile exactly.
- **Don't touch the auth files.** `src/convex/auth.ts`, `auth.config.ts` and
  `auth/emailOtp.ts` are generated and load-bearing.
- **Authorize on the backend**, not only in the UI.

## Good first issues

The [Known limitations](README.md#known-limitations) list is the roadmap. Ranked by
impact:

1. **Item split fails on send** — assignments aren't forwarded to
   `bills.createBill`, and the client's item IDs don't match the IDs Convex
   assigns on insert. Needs a remap inside the mutation. This blocks an entire
   split mode.
2. **Guest participants get dropped** — the contact picker overwrites the roster
   with registered friends only, silently discarding guests added upstream.
3. **`parseAmount` misreads receipts without decimals** — see
   `src/app/lib/receiptParser.ts`. Real Indian receipts print both ways.
4. **Scanner silently substitutes sample data** on OCR failure instead of showing
   an error.
5. **No draft persistence** — reloading mid-split loses the bill.

## Pull requests

1. Fork, then branch: `git checkout -b fix/item-split-assignments`
2. Keep it focused. One concern per PR.
3. Match the surrounding style. Don't reformat unrelated code.
4. Verify before pushing:

   ```bash
   bun run build   # typecheck + build must pass
   bun run lint
   ```

5. Describe **what changed and why**, and how you tested it. Screenshots for UI
   changes, both light and dark mode.

### Commits

Conventional-ish prefixes, imperative mood:

```
fix(split): forward item assignments to createBill
feat(scanner): surface OCR failures instead of using sample data
docs(readme): correct the delivery-channel description
```

## Reporting bugs

Include: what you expected, what happened, steps to reproduce, and your platform
(browser or Android version). For money bugs, include the exact amounts — the
paisa matters, that's the whole point of the project.

## Security

Please don't open a public issue for a vulnerability. Contact
[@danish296](https://github.com/danish296) directly.

Never commit `.env.local`, `.env.keys`, or an Android keystore. If you do, rotate
the credential — deleting the file in a later commit does not remove it from git
history. See [docs/REPOSITORY_SCOPE.md](docs/REPOSITORY_SCOPE.md).

## Scope

This repo is the open-source app. Hosted-deployment configuration and
infrastructure live elsewhere and won't be merged here — see
[docs/REPOSITORY_SCOPE.md](docs/REPOSITORY_SCOPE.md).

## License

Contributions are licensed under the [MIT License](LICENSE).
