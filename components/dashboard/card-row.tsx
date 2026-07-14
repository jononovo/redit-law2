import type { ReactNode } from "react";

export function CardRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-4">{children}</div>;
}

export function CardRowItem({ children }: { children: ReactNode }) {
  return <div className="w-full max-w-[26rem]">{children}</div>;
}
