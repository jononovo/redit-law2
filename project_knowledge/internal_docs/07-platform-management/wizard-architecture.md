# Wizard Architecture

> Current state of every production wizard, plus a practical guide for building chainable, reusable multi-step wizards in a Next.js + React + Tailwind codebase.

We ship two production wizards today — the 5-step **Onboarding Wizard** (V2, pairing-code flow, live at `/onboarding`; V1 frozen at `/onboarding2`) and an 8-step **Rail5 Card Setup Wizard** — and the Onboarding Wizard hands off seamlessly to the Rail5 Wizard mid-flow. Both share a single typography system, a single step-shell component, and the same patterns for state, transitions, and exit handling.

The first half of this doc is the **current wizard inventory** (what exists, where it lives). The second half is the **pattern guide** — the three patterns that make this maintainable:

1. The shared visual contract (one shell, one typography file)
2. The orchestrator pattern (linear array of step IDs, hoisted state, animated transitions)
3. The chaining pattern (one wizard embedding another with zero duplication)

Code examples in the pattern guide use V1 step names; V2 follows the identical patterns, with its pairing-code concern extracted into a hook (`use-onboarding-pairing.ts`) per the pattern in §3a.

---

## Current wizard inventory

### Onboarding Wizard V2 (live at `/onboarding`)

`components/onboarding/onboarding-wizard-v2.tsx`. Flow: choose-agent-type → register-agent → sign-in → claim-token (fallback only) → add-card-bridge.

- **register-agent** (`steps/register-agent-with-code.tsx`): creates an anonymous pairing code (`POST /api/v1/pairing-codes`, no auth, IP rate-limited), shows it in `BotInstructionBlock` ("Register at creditclaw.com/SKILL.md" + "Use code: xxx-xxx"), and polls `GET /pairing-codes/status` every 5s — auto-advances when the agent registers. Skippable.
- **Pairing hook** (`components/onboarding/use-onboarding-pairing.ts`): owns all pairing-code state and handlers per the wizard hook convention — sessionStorage persistence (`creditclaw_onboarding_pairing_code`), the one-shot claim effect (fires once the user is signed in and `claimEligible` is true), toasts, and outcome callbacks (`onAgentLinked` / `onCodeAdopted` / `onClaimFallback`). The orchestrator only wires callbacks to step navigation.
- **Claim (both orders work):** `POST /api/v1/pairing-codes/claim` after sign-in. A `registered` code links + activates the waiting bot; a still-`pending` code is **adopted** (ownerUid set) so the agent activates the moment it registers later.
- **Fallback:** claim failure or skipping register drops the user onto the manual claim-token step. Agents registering with a code still receive a claim_token.
- **Code lifecycle:** `pending` → `registered` (bot exists but inert: walletStatus pending, no owner) → `claimed`. These three are the only statuses (the legacy `paired` status and its writer/readers were removed). Owner-created codes (ownerUid at creation) skip the inert stage — registering with one activates immediately (V1 behavior).

### Onboarding Wizard V1 (frozen at `/onboarding2`)

A linear 5-step wizard for new bot owner setup. Flow: choose-agent-type → register-bot → sign-in → claim-token → add-card-bridge. The bridge slide only appears if the user claimed a bot (sets `botConnected`). If "Yes, let's add a card" is chosen, the full `Rail5SetupWizardContent` renders inline (not as a modal) with `preselectedBotId` to auto-link the bot and skip the bot selection step. If the user skips at claim-token or add-card-bridge, they go directly to `/overview`. The onboarding page has no auth gate — authentication happens within the wizard flow.

### Rail 5 Setup Wizard

Full-page route at `/setup/rail5` (outside dashboard layout, no sidebar/header). Uses `Rail5SetupWizardContent` with `inline` mode. On complete/close navigates to `/overview`. Entry points: NewCardModal "My Card - Encrypted" option, overview page "Add Your Card" overlay, sub-agent-cards "Add New Card" button — all navigate to `/setup/rail5` instead of opening a Dialog modal. The onboarding wizard (`/onboarding`) still embeds `Rail5SetupWizardContent` inline directly. The old `Rail5SetupWizard` Dialog wrapper has been removed.

Modularized under `components/onboarding/rail5-wizard/` — see §3a for the folder layout. Step specifics: `steps/` holds 9 step files: `name-card.tsx` (step 0), `how-it-works.tsx` (step 1), `spending-limits.tsx` (step 2), `card-entry.tsx` (step 3), `billing-address.tsx` (step 4), `link-bot.tsx` (step 5), `encrypt-deliver.tsx` (step 6), `delivery-result.tsx` (step 7), `test-verification.tsx` (step 8 — optional, beyond visible step dots). The step indicator shows 8 dots (steps 0–7). Step 8 (test verification) has a prompt gate: checks test status on mount — if bot already started/completed, shows verification UI directly; otherwise shows "Do you want to test?" prompt with Skip/Yes. Skip is always available during verification. `wizard-shell.tsx` hides the indicator when `step >= TOTAL_STEPS`.

---

## 1. Shared visual contract

**Goal:** every step in every wizard looks and behaves the same without each step having to know layout details.

### 1a. Typography object

A single file exports a frozen object of class strings used by every wizard step and button:

```ts
// lib/wizard-typography.ts
export const wt = {
  title:           "text-2xl md:text-3xl lg:text-4xl font-bold text-neutral-900",
  subtitle:        "text-base md:text-lg text-neutral-500",
  body:            "text-sm md:text-base",
  bodySmall:       "text-xs md:text-sm",
  primaryButton:   "h-12 md:h-14 rounded-xl text-base md:text-lg",
  secondaryButton: "h-12 md:h-14 rounded-xl text-sm md:text-base",
  fine:            "text-xs",
} as const;
```

**Rule:** every navigation `Button` in any wizard uses `wt.primaryButton` or `wt.secondaryButton` (these include full button sizing: height `h-12 md:h-14`, rounding `rounded-xl`, and font size). To resize buttons or change type scale across all wizards, you edit this one file. No step component owns its own button height. For plain text-link buttons (back/skip as `<button>` without borders), use `wt.body` instead. Small utility buttons (Copy/Telegram/Discord, Retry, Re-download) and exit confirmation buttons are intentionally excluded from `wt` sizing.

### 1b. Step shell component

```tsx
// components/onboarding/wizard-step.tsx
<WizardStep
  title="What kind of agent are you connecting?"
  subtitle="Choose your agent type"
  currentStep={0}
  totalSteps={5}
  onBack={goBack}
  showBack={false}
>
  {/* step body */}
</WizardStep>
```

The shell renders:

- A sticky 1.5px progress bar at the top, width = `(currentStep+1)/totalSteps × 100%`, with a 0.4s width transition.
- Centered content column (`max-w-lg`) on a `bg-neutral-50` page.
- Optional back button using `wt.body`.
- The title (`wt.title`) and optional subtitle (`wt.subtitle`).
- `children` for the step's own form/content.

**Rule:** step files never write headers, progress bars, or page chrome themselves. They render only their unique content inside `<WizardStep>`. This is what allows you to swap any step in or out without breaking layout.

A second shell exists for the Rail5 wizard (`wizard-shell.tsx`) because Rail5 supports two presentation modes (full-page **inline** and absolute-positioned **embedded**). If your wizard only needs one mode, one shell is enough.

---

## 2. Orchestrator pattern

**Goal:** the wizard component itself is small, predictable, and easy to extend by adding one entry to a list.

The Onboarding Wizard is the canonical example (~210 LoC). Its anatomy:

### 2a. Step list as a const array

```ts
type StepId =
  | "choose-agent-type"
  | "register-bot"
  | "sign-in"
  | "claim-token"
  | "add-card-bridge";

const STEPS: StepId[] = [
  "choose-agent-type",
  "register-bot",
  "sign-in",
  "claim-token",
  "add-card-bridge",
];
```

Adding a step = add an ID to the union, add it to the array, add a `case` to the render switch (below). Reordering = reorder the array. Removing = delete from both.

### 2b. State hoisted to the orchestrator

All cross-step data lives on the orchestrator, never in the steps:

```ts
interface WizardState {
  agentType: string | null;
  botId: string | null;
  botName: string | null;
  botConnected: boolean;
  isAuthenticated: boolean;
}
```

Each step receives only what it needs via props plus an `onNext(payload?)` callback. The orchestrator merges the payload into state and advances:

```tsx
case "choose-agent-type":
  return (
    <ChoosePath
      currentStep={currentStepIndex}
      totalSteps={totalSteps}
      onNext={(agentType) => {
        setState((s) => ({ ...s, agentType }));
        goForward();
      }}
    />
  );
```

This keeps step files dumb and testable.

### 2c. Index + transition class for navigation

Two pieces of local state drive everything visible:

```ts
const [currentStepIndex, setCurrentStepIndex] = useState(0);
const [transitionClass, setTransitionClass] = useState("wizard-step-active");
```

Forward / back are wrapped in a single helper that sequences three CSS classes (exit → enter → active) over ~220ms to produce a slide-and-fade. The full keyframes are inlined as a `<style jsx global>` block in the orchestrator — no animation library required:

```tsx
const animateTransition = (direction, callback) => {
  setTransitionClass(direction === "forward" ? "wizard-step-exit" : "wizard-step-exit-back");
  setTimeout(() => {
    callback();                       // mutate index
    setTransitionClass(direction === "forward" ? "wizard-step-enter" : "wizard-step-enter-back");
    setTimeout(() => setTransitionClass("wizard-step-active"), 20);
  }, 200);
};
```

### 2d. Deep-link & conditional skip

- The orchestrator reads `?step=<stepId>` from the URL once on mount and seeds `currentStepIndex` from `STEPS.indexOf(stepParam)`. This makes any step linkable.
- A `useEffect` watches state changes and auto-advances when applicable: e.g. once `botConnected` flips to `true`, the `claim-token` step is auto-advanced. Conditional flow is expressed as **effects on state**, not as branches in the array.

### 2e. Render-switch is the only routing logic

```tsx
function renderStep() {
  switch (currentStep) {
    case "choose-agent-type": return <ChoosePath … />;
    case "register-bot":     return <RegisterBot … />;
    /* … */
  }
}
```

Wrapped in a single transition-class div:

```tsx
<div className={transitionClass}>{renderStep()}</div>
```

That's the whole wizard.

---

## 3. Chaining: one wizard embedding another

**Goal:** the same wizard works as a standalone full-page route **and** as an embedded continuation of another wizard, with zero code duplication.

This is the most subtle part of the system and the one that keeps two flows maintainable as one. Three rules make it work.

### 3a. Split orchestrator from presentation

The Rail5 wizard ships as a **module folder** instead of a single file:

```
components/onboarding/rail5-wizard/
├── index.tsx                      # re-exports Rail5SetupWizardContent
├── rail5-wizard-content.tsx       # orchestrator: hook + shell + step switch
├── use-rail5-wizard.ts            # custom hook with all state + handlers
├── wizard-shell.tsx               # layout (inline vs embedded modes)
├── step-indicator.tsx             # progress dots
├── types.ts                       # props, constants (TOTAL_STEPS), enums
└── steps/                         # one file per step, all dumb components
```

`use-rail5-wizard.ts` owns **every** state variable and **every** handler. The orchestrator (`rail5-wizard-content.tsx`) calls the hook, passes its return value as `w`, and feeds individual fields to step components:

```tsx
export function Rail5SetupWizardContent(props) {
  const w = useRail5Wizard(props);
  return (
    <WizardShell {...shellProps(w)}>
      {w.step === 0 && <HowItWorks onNext={() => w.setStep(1)} />}
      {w.step === 1 && <CardEntry {...cardEntryProps(w)} />}
      {/* … */}
    </WizardShell>
  );
}
```

**Why this matters:** because all behavior lives in the hook, the orchestrator file stays under ~170 LoC even with 9 steps. Rendering modes (inline vs modal, dialog vs page) become a prop, not a fork in the codebase.

### 3b. Presentation mode as a single prop

```ts
interface Rail5SetupWizardContentProps {
  onComplete: () => void;
  onClose: () => void;
  preselectedBotId?: string;
  inline?: boolean;
}
```

`inline` toggles two things in `WizardShell`:

| `inline=false` (embedded in modal) | `inline=true` (full-page route) |
|---|---|
| Close button: `absolute -right-4 -top-4` | Close button: `fixed top-4 right-4` |
| Renders inside a wrapper provided by parent | Wraps itself in `min-h-screen flex bg-neutral-50` |

`preselectedBotId` lets the embedding wizard pre-fill the step that would otherwise prompt the user to pick a bot — and the back-arrow logic in the orchestrator skips that step on the way back when it's preselected:

```tsx
onBack={() => w.setStep(w.preselectedBotId ? 4 : 5)}
```

### 3c. Hand-off as a boolean swap

The Onboarding Wizard chains into the Rail5 Wizard with a single piece of local state:

```tsx
const [showCardWizard, setShowCardWizard] = useState(false);

// inside add-card-bridge step:
onNext={() => setShowCardWizard(true)}

// at the top of the render:
if (showCardWizard) {
  return (
    <Rail5SetupWizardContent
      inline
      preselectedBotId={state.botId || undefined}
      onComplete={finishOnboarding}
      onClose={finishOnboarding}
    />
  );
}
```

That's the entire chaining mechanism. The outer wizard:

1. Reaches a "bridge" step.
2. Toggles a boolean.
3. Returns the inner wizard instead of its own render-switch.
4. Passes its own completion callback as `onComplete` so the inner wizard's "done" finishes the parent flow too.

The same `Rail5SetupWizardContent` is also used standalone at `app/setup/rail5/page.tsx` with `inline` and a navigate-to-`/overview` callback. **One component, two contexts, zero duplication.**

---

## How to add a brand-new wizard (replication recipe)

1. Create `components/<your-wizard>/` with:
   - `index.tsx` re-export
   - `<your-wizard>-content.tsx` orchestrator
   - `use-<your-wizard>.ts` hook (all state + handlers)
   - `wizard-shell.tsx` (or reuse `WizardStep` if you only need linear pages)
   - `types.ts` with `TOTAL_STEPS`, prop interfaces, constants
   - `steps/<one-file-per-step>.tsx` — dumb components, no global state
2. Define a `StepId` union and `STEPS: StepId[]` array.
3. Hoist all cross-step data into a single `WizardState` interface owned by the orchestrator.
4. Pass `currentStep`, `totalSteps`, `onBack`, `onNext(payload?)` (and any required pre-filled values) into each step. Steps call back; they don't mutate global state.
5. Use `wt` from `lib/wizard-typography.ts` for every title, subtitle, body, and button — no ad-hoc sizes.
6. If your wizard ever needs to be embedded inside another wizard, accept `inline?: boolean` and a `preselectedXxx?` prop, and let the embedding parent flip a boolean to swap your wizard in.
7. For deep-linking, read `?step=` from `useSearchParams()` once on mount and seed the index.
8. For conditional skips, write a `useEffect` that watches the relevant state and calls `goForward()` — keep the array linear.

If you follow these eight steps, the new wizard will look, animate, deep-link, exit-confirm, and chain identically to the existing two — and everyone reading the codebase will recognize the pattern immediately.

---

## What we deliberately do **not** do

- **No wizard framework / library.** Plain React state + a `switch`. The whole orchestrator is short enough to read in one sitting.
- **No global wizard context.** Each wizard owns its own state. Shared data crosses wizard boundaries only as explicit props (e.g. `preselectedBotId`).
- **No per-step CSS files or per-step layouts.** All chrome lives in the shell; all type sizes live in `wt`.
- **No duplicated dialog vs page versions.** A single `inline` prop covers both modes; the dialog wrapper has been removed.

The discipline is what keeps it maintainable. A new wizard is a folder, a list, a hook, and a switch — nothing more.
