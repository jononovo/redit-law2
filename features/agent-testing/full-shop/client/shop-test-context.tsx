"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ShopState,
  CartItem,
  FullShopScenarioConfig,
  FullShopFieldEvent,
  DerivedStageGate,
  PolledEvent,
} from "../shared/types";
import { createEmptyShopState } from "../shared/types";
import { STAGE_PAGE_MAP, FULL_SHOP_STAGES } from "../shared/constants";
import { deriveStageGatesFromEventLog } from "../shared/derive-stage-gates";
import { useFullShopTestTracker } from "./use-full-shop-test-tracker";
import { useEventPoller } from "./use-event-poller";
import { useStateProjector } from "./use-state-projector";
import { SHOP_PRODUCT_CATALOG } from "../shared/scenario-definitions";

const STORAGE_KEY_PREFIX = "shop-test-";

interface PersistedState {
  shopState: ShopState;
  cart: CartItem[];
}

function saveToSession(testId: string, state: ShopState, cart: CartItem[]) {
  try {
    sessionStorage.setItem(
      `${STORAGE_KEY_PREFIX}${testId}`,
      JSON.stringify({ shopState: state, cart } satisfies PersistedState),
    );
  } catch {}
}

function loadFromSession(testId: string): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${testId}`);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function deriveCurrentStage(gates: DerivedStageGate[]): string | null {
  let current: string | null = null;
  for (let i = 0; i < gates.length; i++) {
    if (gates[i].eventCount > 0) {
      current = gates[i].stage;
    } else {
      break;
    }
  }
  return current;
}

interface ShopTestContextValue {
  testId: string;
  isObserver: boolean;
  isLoading: boolean;
  testStatus: string;
  shopState: ShopState;
  cart: CartItem[];
  scenario: FullShopScenarioConfig | null;
  stageGates: DerivedStageGate[];
  currentStage: string | null;
  trackEvent: (
    eventType: string,
    stage: string,
    fieldName?: string | null,
    valueSnapshot?: string | null,
    valueLength?: number,
  ) => void;
  flushEvents: () => Promise<void>;
  setShopState: (updater: (prev: ShopState) => ShopState) => void;
  setCart: (updater: (prev: CartItem[]) => CartItem[]) => void;
  advanceStage: (stage: string) => void;
  setCurrentPage: (page: string) => void;
}

const ShopTestContext = createContext<ShopTestContextValue | null>(null);

export function useShopTest(): ShopTestContextValue {
  const ctx = useContext(ShopTestContext);
  if (!ctx) throw new Error("useShopTest must be used within ShopTestContextProvider");
  return ctx;
}

interface ProviderProps {
  testId: string;
  children: ReactNode;
}

export function ShopTestContextProvider({ testId, children }: ProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const observeToken = searchParams.get("observe");
  const isObserver = !!observeToken;

  const restored = !isObserver ? loadFromSession(testId) : null;

  const [shopState, setShopStateRaw] = useState<ShopState>(
    () => restored?.shopState ?? createEmptyShopState(),
  );
  const [cart, setCartRaw] = useState<CartItem[]>(() => restored?.cart ?? []);
  const [isLoading, setIsLoading] = useState(true);
  const [testStatus, setTestStatus] = useState("created");
  const [scenario, setScenario] = useState<FullShopScenarioConfig | null>(null);
  const [stageGates, setStageGates] = useState<DerivedStageGate[]>([]);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const initDone = useRef(false);

  const allEventsRef = useRef<FullShopFieldEvent[]>([]);
  const scenarioRef = useRef<FullShopScenarioConfig | null>(null);
  useEffect(() => { scenarioRef.current = scenario; }, [scenario]);

  const shopStateRef = useRef(shopState);
  const cartRef = useRef(cart);

  const setShopState = useCallback(
    (updater: (prev: ShopState) => ShopState) => {
      setShopStateRaw((prev) => {
        const next = updater(prev);
        shopStateRef.current = next;
        if (!isObserver) saveToSession(testId, next, cartRef.current);
        return next;
      });
    },
    [testId, isObserver],
  );

  const setCart = useCallback(
    (updater: (prev: CartItem[]) => CartItem[]) => {
      setCartRaw((prev) => {
        const next = updater(prev);
        cartRef.current = next;
        if (!isObserver) saveToSession(testId, shopStateRef.current, next);
        return next;
      });
    },
    [testId, isObserver],
  );

  const tracker = useFullShopTestTracker({
    testId,
    enabled: !isObserver,
  });

  const trackEvent = useCallback(
    (
      eventType: string,
      stage: string,
      fieldName: string | null = null,
      valueSnapshot: string | null = null,
      valueLength: number = 0,
    ) => {
      if (isObserver) return;
      tracker.trackEvent(eventType, stage, fieldName, valueSnapshot, valueLength);
    },
    [isObserver, tracker],
  );

  const handlePageChange = useCallback(
    (page: string) => {
      const path = page ? `/test-shop/${testId}/${page}` : `/test-shop/${testId}`;
      const currentPath = window.location.pathname;
      const targetWithObserve = observeToken
        ? `${path}?observe=${observeToken}`
        : path;
      if (currentPath !== path) {
        router.replace(targetWithObserve);
      }
    },
    [testId, router, observeToken],
  );

  const handleObserverStateChange = useCallback(
    (state: ShopState) => {
      setShopStateRaw(state);
      if (state.selectedProductSlug) {
        const product = SHOP_PRODUCT_CATALOG.find(p => p.slug === state.selectedProductSlug);
        if (product) {
          setCartRaw([{
            productSlug: product.slug,
            productName: product.name,
            color: state.selectedColor ?? "",
            size: state.selectedSize ?? "",
            quantity: state.quantity,
            unitPrice: product.price,
          }]);
        }
      }
    },
    [],
  );

  const { projectEvents, initializeFromSnapshot } = useStateProjector({
    onStateChange: handleObserverStateChange,
    onPageChange: handlePageChange,
  });

  const handlePolledEvents = useCallback(
    (events: PolledEvent[]) => {
      projectEvents(events);

      const typed: FullShopFieldEvent[] = events
        .filter((e): e is PolledEvent & { stage: string } => e.stage !== null)
        .map((e) => ({ ...e, stage: e.stage }));

      if (typed.length > 0) {
        allEventsRef.current = [...allEventsRef.current, ...typed];
        if (scenarioRef.current) {
          const gates = deriveStageGatesFromEventLog(allEventsRef.current, scenarioRef.current);
          setStageGates(gates);
          setCurrentStage(deriveCurrentStage(gates));
        }
      }
    },
    [projectEvents],
  );

  useEventPoller({
    testId,
    ownerToken: observeToken ?? "",
    enabled: isObserver && !isLoading,
    onEvents: handlePolledEvents,
  });

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    async function init() {
      try {
        if (isObserver) {
          const statusRes = await fetch(
            `/api/v1/agent-testing/tests/${testId}/status?observe=${observeToken}`,
          );
          if (!statusRes.ok) {
            setIsLoading(false);
            return;
          }
          const statusData = await statusRes.json();
          setTestStatus(statusData.status);

          if (statusData.stage_snapshot) {
            initializeFromSnapshot(statusData.stage_snapshot);
          }

          const detailRes = await fetch(
            `/api/v1/agent-testing/tests/${testId}/detail?observe=${observeToken}`,
          );
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            if (detailData.scenario) {
              setScenario(detailData.scenario);
            }
          }

          if (statusData.current_page) {
            handlePageChange(statusData.current_page);
          }
        } else {
          const detailRes = await fetch(
            `/api/v1/agent-testing/tests/${testId}/detail`,
          );
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            setTestStatus(detailData.status);
            if (detailData.scenario) {
              setScenario(detailData.scenario);
            }
          }
        }
      } catch (err) {
        console.error("[shop-test-context] init error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [testId, isObserver, observeToken, initializeFromSnapshot, handlePageChange]);

  const value: ShopTestContextValue = {
    testId,
    isObserver,
    isLoading,
    testStatus,
    shopState,
    cart,
    scenario,
    stageGates,
    currentStage,
    trackEvent,
    flushEvents: tracker.flush,
    setShopState,
    setCart,
    advanceStage: tracker.advanceStage,
    setCurrentPage: tracker.setCurrentPage,
  };

  return (
    <ShopTestContext.Provider value={value}>
      {children}
    </ShopTestContext.Provider>
  );
}
