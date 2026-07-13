# In-App Feedback & Support Widget — Technical Implementation Guide

This document describes the implementation of the in-app feedback/support widget used in the 5Ducks platform. The widget allows authenticated users to submit bug reports, feature requests, billing questions, technical support requests, and general feedback — all from a lightweight dialog accessible from the main navigation.

---

## Architecture Overview

The system has three layers:

1. **Trigger** — A menu item in the main navigation opens the feedback dialog
2. **Frontend Dialog** — A modal with a type selector and message textarea
3. **Backend Route** — Validates input, enriches with user metadata, and emails the submission to a support inbox

There is no database table for feedback storage. Submissions are delivered as formatted emails to the support address, with the user's email set as `replyTo` so admins can respond directly from their inbox.

---

## 1. Frontend: Trigger (Main Navigation)

The feedback dialog is opened from a dropdown menu item in the main navigation bar.

**File:** `client/src/components/main-nav.tsx`

### Key implementation details:

- State variable controls dialog visibility: `const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);`
- A "Support" menu item with a `LifeBuoy` icon opens the dialog on click
- The `FeedbackDialog` component is rendered at the bottom of the nav, outside the dropdown, controlled by the `open` / `onOpenChange` props

```tsx
import { FeedbackDialog } from "@/features/feedback";

// In the component:
const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

// In the dropdown menu:
<DropdownMenuItem
  onClick={() => setFeedbackDialogOpen(true)}
  className="cursor-pointer text-muted-foreground hover:text-foreground"
>
  <LifeBuoy className="h-4 w-4 mr-2" />
  <span>Support</span>
</DropdownMenuItem>

// At the bottom of the component, outside the dropdown:
<FeedbackDialog
  open={feedbackDialogOpen}
  onOpenChange={setFeedbackDialogOpen}
/>
```

---

## 2. Frontend: FeedbackDialog Component

**File:** `client/src/features/feedback/components/FeedbackDialog.tsx`

A self-contained dialog component using Radix UI (via shadcn/ui). It manages its own form state and submission logic.

### Props

```typescript
interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

### Feedback Types

```typescript
type FeedbackType = "bug" | "feature" | "billing" | "technical" | "general";

const feedbackTypes: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "billing", label: "Billing Question" },
  { value: "technical", label: "Technical Support" },
  { value: "general", label: "General Feedback" },
];
```

### UI Structure

The dialog contains:
- **Header:** LifeBuoy icon + "Support" title, with a friendly description encouraging feedback
- **Type selector:** A `<Select>` dropdown with the five feedback types
- **Message field:** A `<Textarea>` with 4 rows, placeholder "Tell us what's on your mind..."
- **Footer:** Cancel button (outline style) + Send Feedback button (primary, with Send icon)

### Submission Logic

Uses TanStack Query's `useMutation` to POST to `/api/feedback`:

```typescript
const submitFeedback = useMutation({
  mutationFn: async (data: { type: FeedbackType; message: string }) => {
    const response = await apiRequest("POST", "/api/feedback", data);
    return response.json();
  },
  onSuccess: () => {
    toast({
      title: "Feedback sent",
      description: "Thank you for your feedback! We'll get back to you soon.",
    });
    setFeedbackType("");
    setMessage("");
    onOpenChange(false);
  },
  onError: (error: any) => {
    toast({
      title: "Failed to send feedback",
      description: error.message || "Please try again later.",
      variant: "destructive",
    });
  },
});
```

### Validation

Client-side: The submit button is disabled when no type is selected or the message is empty. An additional check in `handleSubmit` shows a toast if fields are missing.

### UI/UX Details

- The submit button shows a loading spinner (`Loader2` icon with `animate-spin`) while the mutation is pending
- On success, the form resets (type and message cleared) and the dialog closes
- On error, a destructive toast displays the error message
- Dialog max width: `sm:max-w-[425px]`

### Dependencies (UI Components)

- `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle` — from shadcn/ui dialog
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` — from shadcn/ui select
- `Textarea` — from shadcn/ui textarea
- `Button` — from shadcn/ui button
- `useToast` — toast notification hook
- `apiRequest` — centralized fetch wrapper for API calls
- Icons: `LifeBuoy`, `Send`, `Loader2` from lucide-react

---

## 3. Feature Module Export

**File:** `client/src/features/feedback/index.ts`

The feedback feature uses a barrel export pattern:

```typescript
export { FeedbackDialog } from './components/FeedbackDialog';
```

This keeps the import clean from consuming components: `import { FeedbackDialog } from "@/features/feedback";`

---

## 4. Backend: API Route

**File:** `server/features/feedback/routes.ts`

### Route Registration

The route is registered in the main server setup:

```typescript
import { registerFeedbackRoutes } from "./features/feedback/routes";
registerFeedbackRoutes(app);
```

### Endpoint

`POST /api/feedback` — Protected by `requireAuth` middleware.

### Request Validation (Zod)

```typescript
const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "billing", "technical", "general"]),
  message: z.string().min(1, "Message is required"),
});
```

### Processing Flow

1. Extract authenticated user ID from the request
2. Validate request body with Zod schema
3. Fetch user details from the database (username, email, signup date)
4. Map the feedback type to a human-readable label
5. Build an HTML email and plain-text fallback
6. Send via SendGrid to the support inbox
7. Return `{ success: true }` response

### User Metadata Enrichment

The email includes context about the submitter:
- **Username** (or "Unknown User")
- **Email address**
- **Member since** date (formatted as "Month Day, Year")
- **User ID** (numeric)

### Email Construction

**Subject line:** `[Bug Report] Feedback from JohnDoe` (type label in brackets + username)

**HTML template:** A styled email with:
- Type label as heading with bottom border
- Gray info card with user metadata (From, Email, Member since, User ID)
- White content card with the message (preserves whitespace via `white-space: pre-wrap`)
- Footer note: "Reply directly to this email to respond to [username]."

**Plain text fallback:** Same information in plain text format with `=` underline for the heading.

---

## 5. Email Delivery Service

**File:** `server/email/send.ts`

A centralized email sending utility wrapping SendGrid's Node.js SDK.

### Configuration

```typescript
const sendGridService = new MailService();
sendGridService.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'quack@5ducks.ai';
const FROM_NAME = 'Jon @ 5Ducks';
```

### Interface

```typescript
interface SendEmailOptions {
  to: string;
  cc?: string[];
  content: EmailContent;
  fromName?: string;    // Overrides default FROM_NAME
  fromEmail?: string;   // Overrides default FROM_EMAIL
  replyTo?: string;     // User's email for direct replies
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}
```

### How Feedback Uses It

```typescript
await sendEmail({
  to: "support@5ducks.ai",
  replyTo: userEmail,           // Allows admin to reply directly to the user
  fromName: "5Ducks Feedback",  // Overrides default sender name
  content: {
    subject,
    html: htmlContent,
    text: textContent,
  },
});
```

### Tracking Settings

Click tracking is disabled, open tracking is enabled:

```typescript
trackingSettings: {
  clickTracking: { enable: false },
  openTracking: { enable: true }
}
```

---

## 6. Admin-Facing: How Feedback is Reviewed

There is **no in-app admin inbox** for feedback. The workflow is:

1. User submits feedback via the dialog
2. Email lands in the `support@5ducks.ai` inbox
3. Admin reads the email, which includes all user context
4. Admin replies directly — the `replyTo` header ensures the reply goes to the user's email

This keeps the implementation simple and avoids building a full ticketing system. The email serves as both the notification and the record.

---

## 7. Adapting for Another Platform

To replicate this system on a different platform:

### Required Services
- **Email delivery service** (SendGrid, Postmark, SES, Resend, etc.)
- **Authentication system** (to identify the submitting user)

### Minimum Implementation Checklist

| Layer | What to Build |
|-------|--------------|
| **Database** | None required (email-only approach) |
| **Backend route** | POST endpoint with auth, Zod validation, user lookup, email send |
| **Frontend component** | Modal/dialog with type dropdown + textarea + submit button |
| **Navigation trigger** | Menu item or floating button that opens the dialog |
| **Email template** | HTML + plain text with user metadata and message content |

### Key Design Decisions

1. **No database storage** — Feedback goes straight to email. This is intentional: it avoids building an admin inbox, ticketing UI, status tracking, etc. If you need those features later, you can add a database table alongside the email notification.

2. **replyTo header** — Setting `replyTo` to the user's email means admins can respond from their inbox without any in-app messaging system.

3. **User metadata enrichment** — The backend fetches user details (not sent from the frontend) to prevent spoofing and ensure accurate context.

4. **Client-side validation + server-side validation** — Both layers validate. The frontend disables the submit button, the backend validates with Zod.

5. **Toast notifications** — Success and error states are communicated via toast popups, not page redirects.

6. **No rate limiting** — The current implementation doesn't rate-limit feedback submissions. Consider adding one if abuse is a concern.

### Customization Points

- **Feedback types** — Add or remove categories in both the frontend array and backend Zod enum
- **Support email** — Change the `to` address in the backend route
- **Email template** — Modify the HTML/text templates to match your brand
- **Trigger location** — The dialog can be triggered from anywhere (nav menu, floating button, settings page, etc.)
- **Storage** — Add a `feedback` database table if you need in-app tracking, status management, or analytics

---

## File Reference

| File | Purpose |
|------|---------|
| `client/src/features/feedback/components/FeedbackDialog.tsx` | Dialog UI component |
| `client/src/features/feedback/index.ts` | Feature barrel export |
| `client/src/components/main-nav.tsx` | Navigation trigger (Support menu item) |
| `server/features/feedback/routes.ts` | POST /api/feedback route handler |
| `server/email/send.ts` | SendGrid email delivery utility |
