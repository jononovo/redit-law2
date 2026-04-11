"use client";

import { useState } from "react";
import { Search, Settings, LogOut, LifeBuoy, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { NotificationPopover } from "./notification-popover";
import { FeedbackDialog } from "./feedback-dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" data-testid="button-sidebar-toggle" />
        <h1 className="text-xl font-bold text-neutral-900">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input 
                placeholder="Search transactions..." 
                className="pl-9 h-10 rounded-full bg-neutral-50 border-transparent focus-visible:bg-white focus-visible:ring-primary/20 transition-all"
                data-testid="input-search"
            />
        </div>

        <NotificationPopover />

        <div className="h-8 w-px bg-neutral-200 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 pl-1 cursor-pointer outline-none" data-testid="button-user-menu">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-neutral-900">{user?.displayName || "User"}</p>
                <p className="text-xs text-neutral-500">{user?.email || "Pro Plan"}</p>
              </div>
              <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="cursor-pointer"
              data-testid="menu-item-settings"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/docs")}
              className="cursor-pointer"
              data-testid="menu-item-documentation"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Documentation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setFeedbackDialogOpen(true)}
              className="cursor-pointer"
              data-testid="menu-item-support"
            >
              <LifeBuoy className="w-4 h-4 mr-2" />
              Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer text-red-600 focus:text-red-600"
              data-testid="menu-item-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <FeedbackDialog
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
        />
      </div>
    </header>
  );
}
