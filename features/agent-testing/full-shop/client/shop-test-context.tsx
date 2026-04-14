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
  instructionText: string | null;
  agentEventCount: number;
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
  const [instructionText, setInstructionText] = useState<string | null>(null);
  const [stageGates, setStageGates] = useState<DerivedStageGate[]>([]);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [agentEventCount, setAgentEventCount] = useState(0);
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

  const handleTimeoutRef = useRef<() => void>(undefined);
  const handleTimeout = useCallback(() => {
    setTestStatus("timed_out");
    try {
      sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${testId}`);
    } catch {}
  }, [testId]);
  handleTimeoutRef.current = handleTimeout;

  const tracker = useFullShopTestTracker({
    testId,
    enabled: !isObserver,
    onTimeout: handleTimeout,
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

  const terminalRef = useRef(false);

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

  const guardedPageChange = useCallback(
    (page: string) => {
      if (terminalRef.current && page !== "confirmation") return;
      handlePageChange(page);
    },
    [handlePageChange],
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
    onPageChange: guardedPageChange,
  });

  const handlePolledEvents = useCallback(
    (events: PolledEvent[]) => {
      projectEvents(events);

      const typed: FullShopFieldEvent[] = events
        .filter((e): e is PolledEvent & { stage: string } => e.stage !== null)
        .map((e) => ({ ...e, stage: e.stage }));

      if (typed.length > 0) {
        allEventsRef.current = [...allEventsRef.current, ...typed];
        setAgentEventCount((c) => c + typed.length);
        if (scenarioRef.current) {
          const gates = deriveStageGatesFromEventLog(allEventsRef.current, scenarioRef.current);
          setStageGates(gates);
          setCurrentStage(deriveCurrentStage(gates));
        }
      }
    },
    [projectEvents],
  );

  const handleStatusChange = useCallback((status: string) => {
    setTestStatus(status);
    if ((status === "scored" || status === "submitted") && isObserver) {
      terminalRef.current = true;
      handlePageChange("confirmation");
    }
  }, [isObserver, handlePageChange]);

  useEventPoller({
    testId,
    ownerToken: observeToken ?? "",
    enabled: isObserver && !isLoading,
    onEvents: handlePolledEvents,
    onStatusChange: handleStatusChange,
    onTimeout: handleTimeout,
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
          if (statusRes.status === 410) {
            handleTimeoutRef.current?.();
            return;
          }
          if (!statusRes.ok) {
            setIsLoading(false);
            return;
          }
          const statusData = await statusRes.json();
          if (statusData.status === "timed_out") {
            handleTimeoutRef.current?.();
            return;
          }
          setTestStatus(statusData.status);

          const hasSnapshot = statusData.stage_snapshot && Object.keys(statusData.stage_snapshot).length > 0;
          if (hasSnapshot) {
            initializeFromSnapshot(statusData.stage_snapshot);
            setAgentEventCount((c) => Math.max(c, 1));
          }
          if (statusData.stages_completed > 0 || statusData.current_page || statusData.event_count > 0) {
            setAgentEventCount((c) => Math.max(c, 1));
          }

          const detailRes = await fetch(
            `/api/v1/agent-testing/tests/${testId}/detail?observe=${observeToken}`,
          );
          if (detailRes.status === 410) {
            handleTimeoutRef.current?.();
            return;
          }
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            if (detailData.scenario) {
              setScenario(detailData.scenario);
            }
            if (detailData.instruction_text) {
              setInstructionText(detailData.instruction_text);
            }
          }

          if (statusData.status === "scored" || statusData.status === "submitted") {
            terminalRef.current = true;
            handlePageChange("confirmation");
          } else if (statusData.current_page) {
            let page = statusData.current_page;
            if (page === "product" && statusData.stage_snapshot?.product) {
              page = `product/${statusData.stage_snapshot.product}`;
            }
            handlePageChange(page);
          }
        } else {
          const detailRes = await fetch(
            `/api/v1/agent-testing/tests/${testId}/detail`,
          );
          if (detailRes.status === 410) {
            handleTimeoutRef.current?.();
            return;
          }
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            if (detailData.status === "timed_out") {
              handleTimeoutRef.current?.();
              return;
            }
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
    instructionText,
    agentEventCount,
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
