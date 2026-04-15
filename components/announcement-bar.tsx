"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="bg-neutral-800 text-white text-xs font-medium py-2 text-center relative w-full z-[60]">
      <span>Claude Plugin launching 14 April '26</span>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
        aria-label="Dismiss announcement"
        data-testid="button-dismiss-announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
