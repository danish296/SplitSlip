# Repository scope

SplitSlip is developed as one codebase with two distributions:

- **This repository** — the open-source application. Complete and self-hostable.
- **A hosted version** — the same application, plus deployment and operations
  material that is not published.

This document records exactly where the line sits, so it stays consistent as the
project moves.

---

## The rule

> Everything needed to **run** SplitSlip is here.
> Everything specific to running **our** SplitSlip is not.

A fork should be able to clone this repo, create a free Convex deployment, and
have a fully working app with no missing pieces and no reference to private
infrastructure. That property is the test for anything added.

---

## Published

| Area | Contents |
| --- | --- |
| Client | All of `src/app`, `src/pages`, `src/components`, `src/hooks`, `src/lib` |
| Backend | All of `src/convex` — schema, queries, mutations, actions, crons, auth config |
| Design system | `src/index.css` tokens, `src/app/components/paper.tsx` |
| Business logic | `splitEngine.ts`, `money.ts`, `splits.ts`, `flow.ts`, `receiptParser.ts` |
| Android | The whole `android/` native project *source* (manifest, Gradle scripts, resources, icons) |
| Config | `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.prettierrc`, `capacitor.config.json`, `convex.json`, `components.json` |
| Templates | `.env.example` with placeholder values only |
| Docs | `README.md`, `CONTRIBUTING.md`, `LICENSE`, this file, `docs/CONVENTIONS.md` |
| Brand | `docs/brand/`, `public/logo.*`, `public/manifest.webmanifest` |

## Not published

### Secrets — never, under any circumstances

| Excluded | Why |
| --- | --- |
| `.env.local` | Real deployment URLs and local secrets |
| `.env.keys` | Private encryption keys. Leaking this compromises every encrypted value. |
| `.env`, any other `.env.*` | Same, minus the example |
| `*.jks`, `*.keystore`, `keystore.properties` | Android release signing. A leaked keystore lets anyone publish a build that Android trusts as ours. |
| `google-services.json` | Firebase project credentials |

`RESEND_API_KEY`, `JWKS`, `JWT_PRIVATE_KEY` and `SITE_URL` are Convex deployment
variables. They are set with `convex env set` and never live in a file, so there
is nothing in the tree to leak.

### Build output — regenerated, not versioned

| Excluded | Regenerate with |
| --- | --- |
| `node_modules/` | `bun install` |
| `dist/` | `bun run build` |
| `src/convex/_generated/` | `bunx convex dev` |
| `android/app/src/main/assets/public/` | `bunx cap sync android` |
| `android/build/`, `android/app/build/`, `android/.gradle/` | Gradle |
| `android/local.properties` | Android Studio (machine-specific SDK path) |
| `*.apk`, `*.aab` | `./gradlew assembleDebug` |

Committing `android/app/src/main/assets/public/` is a common Capacitor mistake — it
duplicates the entire web bundle inside the native project and goes stale
instantly. `cap sync` rebuilds it every time.

### Operational material — belongs to the hosted deployment

Not present in this tree, and should not be added:

- Production Convex deployment names, project IDs and dashboard configuration
- CI/CD pipelines that hold deployment credentials
- Hosting, DNS, CDN and TLS configuration
- Play Store listing assets, release notes and signing pipeline
- Monitoring, alerting, log aggregation and on-call runbooks
- Analytics keys and any customer data or database snapshots

### Large or dead files

| Excluded | Reason |
| --- | --- |
| `eng.traineddata` (5 MB) | tesseract.js fetches language data from its CDN at runtime. The local copy is referenced nowhere. |
| `SplitSlip.apk` (4.4 MB) | Build artifact. Attach binaries to a GitHub Release instead of committing them. |
| `sst-env.d.ts` | Sandbox leftover; its `/// <reference>` points outside the project. |
| `.github/modernize/` | Unrelated tooling scaffolding. |

---

## Open question: the `vly` platform layer

The project was scaffolded on the [vly.ai](https://vly.ai) platform, which leaves
three hooks in the tree:

| File | Role |
| --- | --- |
| `vly-toolbar-readonly.tsx` | Dev overlay, mounted in `src/main.tsx` behind an error boundary |
| `vlyPlugin()` in `vite.config.ts` | Platform build plugin |
| `@vly-ai/integrations` dependency | Gateway SDK for AI / email / payments (see `integrations.md`) |

None of it is required for SplitSlip to run: the toolbar is wrapped in a boundary
that renders nothing on failure, and the integrations SDK is not imported by any
application code — email goes through Resend directly.

These are currently published as-is so the tree matches what actually builds. They
are candidates for removal in a dedicated cleanup, which would also drop
`integrations.md` and the `hono` dependency (used only by the unreferenced
`main.ts` Deno static server). Removing them touches `main.tsx` and
`vite.config.ts`, so it is deliberately kept as a separate change rather than
bundled into the initial publish.

---

## Adding something new

Ask, in order:

1. **Is it a secret?** → never commit. Add to `.gitignore` first, then use it.
2. **Is it generated or built?** → ignore it, and document the command that
   recreates it.
3. **Is it specific to our hosted instance?** → keep it out of this repo.
4. **Would a fork be broken without it?** → then it belongs here.

If a secret does get committed, rotate it. Removing the file in a later commit
does not remove it from git history.
