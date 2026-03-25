import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skill Index — AI Agent Procurement Skills | CreditClaw",
  description: "Browse procurement skills that teach AI agents how to shop at 50+ vendors. Filter by category, checkout method, and agent friendliness score.",
  openGraph: {
    title: "Skill Index — AI Agent Procurement Skills",
    description: "Browse procurement skills that teach AI agents how to shop at 50+ vendors. Filter by category, checkout method, and agent friendliness score.",
    type: "website",
    url: "https://creditclaw.com/skills",
  },
  twitter: {
    card: "summary",
    title: "Skill Index — CreditClaw",
    description: "Browse procurement skills that teach AI agents how to shop at 50+ vendors.",
  },
  alternates: {
    canonical: "https://creditclaw.com/skills",
  },
};

export default function SkillsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
