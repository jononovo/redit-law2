"use client";

import Link from "next/link";
import {
  Users,
  Activity,
  BarChart3,
  HeartPulse,
  MessageSquare,
  Settings,
  Shield,
} from "lucide-react";

const adminCards = [
  {
    icon: Users,
    title: "Users",
    description: "View and manage platform users, roles, and access flags.",
    href: "/admin123/users",
    ready: false,
  },
  {
    icon: Activity,
    title: "Transactions",
    description: "Monitor all platform transactions across rails.",
    href: "/admin123/transactions",
    ready: true,
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Platform usage metrics, revenue, and growth.",
    href: "/admin123/analytics",
    ready: false,
  },
  {
    icon: HeartPulse,
    title: "Health",
    description: "System health, uptime, and service status.",
    href: "/admin123/health",
    ready: false,
  },
  {
    icon: MessageSquare,
    title: "Support",
    description: "View and respond to user support requests.",
    href: "/admin123/support",
    ready: false,
  },
  {
    icon: Settings,
    title: "Configuration",
    description: "Platform settings, feature flags, and integrations.",
    href: "/admin123/config",
    ready: false,
  },
];

export default function AdminDashboard() {
  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-neutral-900" />
          <h1 className="text-2xl font-bold text-neutral-900" data-testid="text-admin-title">
            Admin Dashboard
          </h1>
        </div>
        <p className="text-neutral-500 text-sm" data-testid="text-admin-description">
          Platform operations and management tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminCards.map((card) => {
          const content = (
            <div
              className={`relative bg-white border border-neutral-200 rounded-xl p-6 transition-all ${
                card.ready
                  ? "hover:border-neutral-300 hover:shadow-sm cursor-pointer"
                  : ""
              }`}
              data-testid={`card-admin-${card.title.toLowerCase()}`}
            >
              {!card.ready && (
                <span className="absolute top-3 right-3 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-400">
                  Coming Soon
                </span>
              )}
              <card.icon className="w-8 h-8 text-neutral-400 mb-3" />
              <h3 className="font-semibold text-neutral-900 mb-1">{card.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{card.description}</p>
            </div>
          );
          if (card.ready) {
            return <Link key={card.title} href={card.href}>{content}</Link>;
          }
          return <div key={card.title}>{content}</div>;
        })}
      </div>
    </>
  );
}
