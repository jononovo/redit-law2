# Wizard Architecture

> A practical guide for building chainable, reusable multi-step wizards in a Next.js + React + Tailwind codebase. Written for a developer who has not seen our code.

We ship two production wizards today — a 5-step **Onboarding Wizard** and an 8-step **Rail5 Card Setup Wizard** — and the Onboarding Wizard hands off seamlessly to the Rail5 Wizard mid-flow. Both share a single typography system, a single step-shell component, and the same patterns for state, transitions, and exit handling.

This document focuses on the **three patterns** that make this maintainable:

1. The shared visual contract (one shell, one typography file)
2. The orchestrator pattern (linear array of step IDs, hoisted state, animated transitions)
3. The chaining pattern (one wizard embedding another with zero duplication)

If you replicate just these three, you get the whole system.

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

**Rule:** every navigation `Button` in any wizard uses `wt.primaryButton` or `wt.secondaryButton`. To resize buttons or change type scale across all wizards, you edit this one file. No step component owns its own button height.

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
