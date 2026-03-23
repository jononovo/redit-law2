"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface RailTab {
  id: string;
  label: string;
  content: React.ReactNode;
  hidden?: boolean;
  badge?: number;
}

interface RailPageTabsProps {
  tabs: RailTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  testIdPrefix?: string;
}

export function RailPageTabs({ tabs, activeTab, onTabChange, testIdPrefix = "rail" }: RailPageTabsProps) {
  const visibleTabs = tabs.filter((t) => !t.hidden);

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className={`grid w-full max-w-md`} style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}>
        {visibleTabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} data-testid={`tab-${testIdPrefix}-${tab.id}`}>
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-bold">
                {tab.badge}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {visibleTabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-6">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
