"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { 
  LayoutDashboard, 
  Bot,
  CreditCard, 
  Activity, 
  Plus,
  PlusCircle,
  DollarSign,
  Wallet,
  Lock,
  Store,
  ShoppingBag,
  FileText,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Gauge,
  Sparkles,
  FlaskConical,
  MessageSquare,
  LifeBuoy,
  Bug,
  Users
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { MANAGED_AGENTS_ROUTE } from "@/lib/managed-agents";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { FeedbackDialog } from "@/components/dashboard/feedback-dialog";
import type { FeedbackRequestType } from "@/lib/support-request-types";
import type { Tier } from "@/features/platform-management/feature-flags/tiers";
import {
  Sidebar as SidebarShell,
  SidebarHeader,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";

const AUTO_COLLAPSE_MEDIA_QUERY = "(max-width: 1100px)";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  subtitle?: string;
  tag?: string;
  tooltip?: string;
  inactive?: boolean;
  external?: boolean;
  requiredAccess?: Tier;
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", href: "/overview" },
  { icon: Bot, label: "Agents", href: "/agents" },
  { icon: ShoppingBag, label: "Managed Agents", href: MANAGED_AGENTS_ROUTE, tag: "beta", tooltip: "Agents CreditClaw runs for you — Jennifer buys from almost any store with your virtual cards." },
  { icon: CreditCard, label: "Virtual Cards", href: "/virtual-cards" },
  { icon: Lock, label: "Self-hosted Cards", subtitle: "Encrypted", href: "/self-hosted", tag: "beta", tooltip: "Self-hosted: Agent uses your card. Secured with: Encryption & Ephemeral Sub-Agent." },
  { icon: Wallet, label: "USDC Wallet", href: "/usdc-wallet", tag: "beta", tooltip: "USDC wallet x402 purchases. Fund with Stripe/Link." },
  // Shop Wallet hidden — Rail 2/Crossmint not yet functional
  // { icon: ShoppingCart, label: "Shop Wallet", subtitle: "USDC for Shopping API", href: "/card-wallet", tag: "coming soon", tooltip: "USDC wallet for Shopping at Amazon/Shopify.", requiredAccess: "admin" },
  { icon: Activity, label: "Transactions", href: "/transactions" },
];

const toolsNavItems: NavItem[] = [
  { icon: Store, label: "Supplier Hub", href: "/skills", external: true },
  { icon: Gauge, label: "Brand Agent Score", href: "https://shopy.sh", external: true },
  { icon: Sparkles, label: "Generate Brand Skill", href: "https://brands.sh", external: true },
  { icon: FlaskConical, label: "Agent Shopping Test", href: "/agent-shopping-test", external: true },
];

const supportDialogItems: { icon: React.ComponentType<{ className?: string }>; label: string; feedbackType: FeedbackRequestType }[] = [
  { icon: MessageSquare, label: "Feedback", feedbackType: "general" },
  { icon: LifeBuoy, label: "Support", feedbackType: "technical" },
  { icon: Bug, label: "Bug", feedbackType: "bug" },
];

const supportNavItems: NavItem[] = [
  { icon: Users, label: "Community", href: "#community" },
];

const salesNavItems: NavItem[] = [
  { icon: PlusCircle, label: "Create Checkout", href: "/checkout/create" },
  { icon: ShoppingBag, label: "Shop", href: "/shop" },
  { icon: DollarSign, label: "My Sales", href: "/sales" },
  { icon: FileText, label: "Invoices", href: "/invoices" },
];

function navRowClasses(isActive: boolean, isInactive?: boolean) {
  return cn(
    "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer",
    "group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center",
    isInactive
      ? "text-neutral-300 hover:bg-neutral-50 hover:text-neutral-400 opacity-60"
      : isActive
        ? "bg-neutral-900 text-white shadow-md shadow-neutral-900/10"
        : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
  );
}

function navIconClasses(isActive: boolean, isInactive?: boolean) {
  return cn("w-5 h-5 flex-shrink-0", isInactive ? "text-neutral-300" : isActive ? "text-white" : "text-neutral-400");
}

function SidebarNavLink({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick: () => void }) {
  const isInactive = item.inactive;
  const linkProps = item.external ? { target: "_blank" as const, rel: "noopener noreferrer" } : {};
  const navLink = (
    <Link href={item.href} {...linkProps} onClick={onClick}>
      <div className={navRowClasses(isActive, isInactive)}>
        <item.icon className={navIconClasses(isActive, isInactive)} />
        <div className="relative flex flex-col group-data-[collapsible=icon]:hidden">
          <span>{item.label}</span>
          {item.subtitle && (
            <span className={cn(
              "text-[10px] font-medium leading-none mt-0.5",
              isActive ? "text-white/50" : "text-neutral-400"
            )}>
              {item.subtitle}
            </span>
          )}
          {item.tag && (
            <span className={cn(
              "absolute -top-1 -right-8 text-[8px] font-semibold uppercase tracking-wider px-1 py-px rounded-sm transition-colors z-10",
              isActive
                ? "text-white/60 bg-white/10"
                : item.tag === "beta"
                  ? "text-neutral-300 group-hover:text-blue-500 group-hover:bg-blue-50"
                  : "text-neutral-300 group-hover:text-neutral-400 group-hover:bg-neutral-100"
            )}>
              {item.tag}
            </span>
          )}
          {isInactive && (
            <span className="absolute -top-1 -right-12 text-[8px] font-semibold uppercase tracking-wider px-1 py-px rounded-sm z-10 text-neutral-400 bg-neutral-100 hover:bg-neutral-200 transition-colors">
              Inactive
            </span>
          )}
        </div>
      </div>
    </Link>
  );
  if (item.tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {navLink}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[220px] text-xs leading-relaxed bg-white text-neutral-700 border border-neutral-200 shadow-md">
          {item.tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }
  return navLink;
}

function SidebarNavSection({
  label,
  open,
  onOpenChange,
  toggleTestId,
  labelClassName,
  children,
}: {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toggleTestId: string;
  labelClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group-data-[collapsible=icon]:hidden">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-1 pt-4 pb-1 px-4 cursor-pointer group"
            data-testid={toggleTestId}
          >
            <span className={cn(
              "text-xs font-semibold uppercase tracking-wider transition-colors",
              labelClassName ?? "text-neutral-400 group-hover:text-neutral-600"
            )}>
              {label}
            </span>
            <ChevronDown className={cn(
              "w-3.5 h-3.5 transition-all",
              labelClassName ?? "text-neutral-400 group-hover:text-neutral-600",
              open && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface AppSidebarProps {
  onNewCard?: () => void;
}

export function AppSidebar({ onNewCard }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const userFlags = user?.flags ?? [];

  const [collapsedPref, setCollapsedPref] = useState(false);
  const [hovering, setHovering] = useState(false);
  const manualPrefRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia(AUTO_COLLAPSE_MEDIA_QUERY);
    const apply = () => {
      if (!manualPrefRef.current) setCollapsedPref(mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!isMobile) setOpen(!collapsedPref || hovering);
  }, [collapsedPref, hovering, isMobile, setOpen]);

  const toggleCollapsedPref = () => {
    manualPrefRef.current = true;
    setHovering(false);
    setCollapsedPref((prev) => !prev);
  };

  const filterByAccess = (items: NavItem[]) =>
    items.filter(item => !item.requiredAccess || userFlags.includes(item.requiredAccess));

  const visibleMainNav = filterByAccess(mainNavItems);
  const visibleSalesNav = filterByAccess(salesNavItems);
  const visibleToolsNav = filterByAccess(toolsNavItems);
  const matchesSectionItem = (items: NavItem[]) =>
    items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"));
  const [salesOpen, setSalesOpen] = useState(() => matchesSectionItem(salesNavItems));
  const [toolsOpen, setToolsOpen] = useState(() => matchesSectionItem(toolsNavItems));
  const [supportOpen, setSupportOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackInitialType, setFeedbackInitialType] = useState<FeedbackRequestType>("general");

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  const openFeedbackDialog = (feedbackType: FeedbackRequestType) => {
    setFeedbackInitialType(feedbackType);
    setFeedbackDialogOpen(true);
    setOpenMobile(false);
  };

  return (
    <SidebarShell
      collapsible="icon"
      className="border-r border-neutral-100"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <SidebarHeader className="p-6 flex-row items-center gap-3 group-data-[collapsible=icon]:p-3 group-data-[collapsible=icon]:justify-center">
        <Image src="/assets/images/logo-claw-chip.png" alt="CreditClaw" width={32} height={32} className="object-contain" />
        <span className="font-bold text-lg tracking-tight text-neutral-900 group-data-[collapsible=icon]:hidden">CreditClaw</span>
        {!isMobile && (
          <button
            type="button"
            onClick={toggleCollapsedPref}
            className="ml-auto p-1 rounded-md text-neutral-300 hover:text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer group-data-[collapsible=icon]:hidden"
            aria-label={collapsedPref ? "Pin sidebar open" : "Collapse sidebar"}
            data-testid="button-toggle-sidebar-collapse"
          >
            {collapsedPref ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        )}
      </SidebarHeader>

      <div className="px-4 mb-6 group-data-[collapsible=icon]:px-1.5">
        <Button
          onClick={() => {
            onNewCard?.();
            setOpenMobile(false);
          }}
          className="w-full justify-start gap-2 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          data-testid="button-new-card"
        >
            <Plus className="w-4 h-4" />
            <span className="group-data-[collapsible=icon]:hidden">New Card</span>
        </Button>
      </div>

      <SidebarContent className="px-4 space-y-1 group-data-[collapsible=icon]:px-1.5">
        {visibleMainNav.map((item) => (
          <SidebarNavLink
            key={item.href}
            item={item}
            isActive={pathname === item.href}
            onClick={handleNavClick}
          />
        ))}

        <SidebarNavSection
          label="Tools"
          open={toolsOpen}
          onOpenChange={setToolsOpen}
          toggleTestId="button-toggle-tools-nav"
        >
          {visibleToolsNav.map((item) => (
            <SidebarNavLink
              key={item.href}
              item={item}
              isActive={pathname === item.href}
              onClick={handleNavClick}
            />
          ))}
        </SidebarNavSection>

        <SidebarNavSection
          label="Sales"
          open={salesOpen}
          onOpenChange={setSalesOpen}
          toggleTestId="button-toggle-sales-nav"
        >
          {visibleSalesNav.map((item) => (
            <SidebarNavLink
              key={item.href}
              item={item}
              isActive={pathname === item.href}
              onClick={handleNavClick}
            />
          ))}
        </SidebarNavSection>

        <SidebarNavSection
          label="Support"
          open={supportOpen}
          onOpenChange={setSupportOpen}
          toggleTestId="button-toggle-support-nav"
          labelClassName="text-primary/80 group-hover:text-primary"
        >
          {supportDialogItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => openFeedbackDialog(item.feedbackType)}
              className={cn("w-full", navRowClasses(false))}
              data-testid={`button-support-${item.label.toLowerCase()}`}
            >
              <item.icon className={navIconClasses(false)} />
              {item.label}
            </button>
          ))}
          {supportNavItems.map((item) => (
            <SidebarNavLink
              key={item.href}
              item={item}
              isActive={pathname === item.href}
              onClick={handleNavClick}
            />
          ))}
        </SidebarNavSection>
      </SidebarContent>

      <FeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        initialType={feedbackInitialType}
      />
    </SidebarShell>
  );
}
