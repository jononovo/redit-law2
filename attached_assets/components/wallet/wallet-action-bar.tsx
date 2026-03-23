"use client";

import { ReactNode } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export interface ActionItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
  "data-testid"?: string;
  hidden?: boolean;
}

export interface BadgeItem {
  icon: LucideIcon;
  label: string;
  className?: string;
  "data-testid"?: string;
}

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  "data-testid"?: string;
  hidden?: boolean;
}

export interface WalletActionBarProps {
  actions?: ActionItem[];
  badge?: BadgeItem | null;
  menuItems?: MenuItem[];
  menuTestId?: string;
}

export function WalletActionBar({ actions, badge, menuItems, menuTestId }: WalletActionBarProps) {
  const visibleActions = (actions || []).filter((a) => !a.hidden);
  const visibleMenuItems = (menuItems || []).filter((m) => !m.hidden);

  const items: ReactNode[] = [];

  visibleActions.forEach((action, idx) => {
    const Icon = action.icon;
    items.push(
      <Button
        key={`action-${idx}`}
        variant="ghost"
        className={action.className || "flex-1 text-xs gap-2 text-neutral-600 cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors"}
        onClick={action.onClick}
        data-testid={action["data-testid"]}
      >
        <Icon className="w-4 h-4" /> {action.label}
      </Button>
    );
  });

  if (badge) {
    const BadgeIcon = badge.icon;
    items.push(
      <div
        key="badge"
        className={badge.className || "flex-1 flex items-center justify-center gap-2 text-xs text-blue-600 font-medium"}
        data-testid={badge["data-testid"]}
      >
        <BadgeIcon className="w-4 h-4" /> {badge.label}
      </div>
    );
  }

  if (visibleMenuItems.length > 0) {
    items.push(
      <DropdownMenu key="menu">
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="text-xs gap-2 text-neutral-600 cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors px-3"
            data-testid={menuTestId}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {visibleMenuItems.map((item, idx) => {
            const MenuIcon = item.icon;
            return (
              <DropdownMenuItem key={idx} onClick={item.onClick} data-testid={item["data-testid"]}>
                <MenuIcon className="w-4 h-4 mr-2" /> {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-100 p-2 flex justify-between">
      {items.map((item, idx) => (
        <span key={idx} className="contents">
          {idx > 0 && <div className="w-px bg-neutral-100 my-1" />}
          {item}
        </span>
      ))}
    </div>
  );
}
