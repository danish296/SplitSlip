# Conventions

House rules for working in this codebase. Most exist because breaking them causes
a specific, real bug.

---

## Money

**The rule: money is never a floating-point number.**

Every monetary value is an integer count of paise and is named with a `Minor`
suffix — `amountMinor`, `taxMinor`, `totalMinor`. There are no exceptions.

```ts
// wrong
const share = total / people.length;

// right
import { splitEvenly } from "@/app/lib/money";
const shares = splitEvenly(totalMinor, people.length);
```

Division uses largest-remainder apportionment (`splitEvenly`,
`distributeByWeights` in `src/app/lib/money.ts`) so leftover paise are assigned to
a real person instead of disappearing into a rounding error. Any split must satisfy
`sum(shares) === total` exactly.

Parse user input with `parseAmountToMinor()`, which returns `null` on anything
malformed. Never `parseFloat` a rupee string.

The client's split is a **preview**. `src/convex/splitEngine.ts` recomputes it
server-side and throws if it doesn't reconcile. Keep the two in agreement.

---

## Convex backend

Functions live in `src/convex/`, configured by `convex.json`.

- Import generated modules through the alias: `@/convex/_generated/server`,
  `@/convex/_generated/api`. Never a relative path from the client.
- Document IDs are `_id`, not `id`. Type them `Id<"tableName">`, not `string`.
  Document types are `Doc<"tableName">`.
- Never declare `_id` or `_creationTime` in a schema — they're implicit. Never
  index `_creationTime`. No duplicate indexes.
- No return-type validators on queries and mutations.
- Anything reaching the network belongs in an `action` with `"use node"` at the
  top. A `"use node"` file cannot also contain queries or mutations.
- Handle `undefined` from `useQuery` (still loading) and `null` (not found)
  separately. They mean different things.
- Authorize inside the function, not just in the UI. Use `requireAuth`,
  `getOptionalAuth` and `canAccessBill` from `src/convex/authHelpers.ts`.
- `schemaValidation` is intentionally `false` in `src/convex/schema.ts`.

### Do not modify these files

Convex Auth generates and depends on them. Editing them breaks sign-in:

```
src/convex/auth.ts
src/convex/auth.config.ts
src/convex/auth/emailOtp.ts
```

---

## Frontend

### Routing

Everything imports from `react-router` (v7), never `react-router-dom`.

Pages go in `src/app/pages/` for authenticated screens or `src/pages/` for public
ones, and must be registered in `src/main.tsx`. Wrap authenticated routes in
`<ProtectedRoute>`.

### Auth state

Read it from the hook. Never reconstruct it:

```ts
import { useAuth } from "@/hooks/use-auth";
const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
```

### Components

- shadcn/ui primitives in `src/components/ui/` are the default building blocks.
- The receipt design system is `src/app/components/paper.tsx` — `TactileButton`,
  `Receipt`, `PaymentSlip`, `StatusBadge`, `ThermalReceiptPrinter` and friends.
  Prefer these over raw markup for anything paper-themed.
- `ScreenShell` from `src/app/components/Shell.tsx` is the standard page frame.

### Styling

- Tailwind CSS 4. Colours come from the `@theme` tokens in `src/index.css` —
  `bg-paper`, `text-ink`, `text-ink-soft`, `border-ink-line`, `bg-stamp`. Don't
  hardcode hex values.
- Titles use `tracking-tight font-bold`.
- Interactive elements need `cursor-pointer`; the base layer sets it for `button`
  and `[role="button"]`, so custom clickable divs need it explicitly.
- **Avoid nested cards.** Borders inside borders inside borders looks like clutter.
- **Avoid shadows.** A thin `border-ink` line is the house style. The `shadow-paper`
  utilities are the only sanctioned exception.
- Mobile-first and mobile-responsive, always. Constrain width so content doesn't
  stretch on wide screens.
- Support light and dark mode. Test both.
- Loading states use a spinning `Loader2`, not skeletons.
- Dialogs with long content must scroll internally so nothing is cut off. Prefer a
  dialog over a new route for a focused task.

### Motion

Framer Motion is installed and expected. Animate mounts, transitions and
interactions — fade, slide, and the tactile press. Respect
`prefers-reduced-motion`; `src/index.css` already has the global guard.

### Feedback

Use Sonner toasts for confirmations, results and errors:

```ts
import { toast } from "sonner";
toast("Payment verified");
```

The `<Toaster />` is mounted in `src/main.tsx`.

---

## Accessibility

- Icon-only buttons need `aria-label`. Decorative icons need `aria-hidden="true"`.
- Live regions (`role="status"`, `aria-live="polite"`) for async progress — the
  scanner and send flow both rely on this.
- Keep focus states visible. Don't remove outlines without replacing them.
- Maintain contrast against the paper background in both themes.

---

## TypeScript

Strict mode. `bun run build` runs `tsc -b` before Vite, so type errors fail the
build. `noUnusedLocals` is off, but don't leave dead imports lying around.

---

## Before opening a PR

```bash
bun run build   # typecheck + production build
bun run lint    # eslint
bun run format  # prettier
```
