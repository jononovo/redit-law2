"use client";

import { useCallback, useRef } from "react";
import type { ShopState } from "../shared/types";
import { createEmptyShopState } from "../shared/types";
import { EVENT_TYPES, STAGE_PAGE_MAP } from "../shared/constants";

interface ProjectorOptions {
  onStateChange: (state: ShopState) => void;
  onPageChange: (page: string) => void;
}

interface PolledEvent {
  event_type: string;
  field_name: string | null;
  value_snapshot: string | null;
  value_length: number;
  sequence_num: number;
  stage: string | null;
  event_timestamp: string;
}

export function useStateProjector({ onStateChange, onPageChange }: ProjectorOptions) {
  const stateRef = useRef<ShopState>(createEmptyShopState());
  const lastPageRef = useRef("");

  const projectEvents = useCallback(
    (events: PolledEvent[]) => {
      let state = { ...stateRef.current };
      let latestPage = lastPageRef.current;

      for (const e of events) {
        const val = e.value_snapshot ?? "";

        switch (e.event_type) {
          case EVENT_TYPES.SEARCH_INPUT:
            state = { ...state, searchQuery: val };
            break;

          case EVENT_TYPES.PRODUCT_CLICK:
            state = { ...state, selectedProductSlug: val };
            break;

          case EVENT_TYPES.COLOR_SELECT:
            state = { ...state, selectedColor: val };
            break;

          case EVENT_TYPES.SIZE_SELECT:
            state = { ...state, selectedSize: val };
            break;

          case EVENT_TYPES.QUANTITY_INPUT:
          case EVENT_TYPES.QUANTITY_INCREMENT:
          case EVENT_TYPES.QUANTITY_DECREMENT:
            state = { ...state, quantity: parseInt(val, 10) || state.quantity };
            break;

          case EVENT_TYPES.ADDRESS_FIELD_INPUT:
            if (e.field_name) {
              state = {
                ...state,
                address: { ...state.address, [e.field_name]: val },
              };
            }
            break;

          case EVENT_TYPES.SHIPPING_METHOD_SELECT:
            state = { ...state, shippingMethod: val };
            break;

          case EVENT_TYPES.PAYMENT_METHOD_SELECT:
            state = { ...state, paymentMethod: val };
            break;

          case EVENT_TYPES.CARD_FIELD_INPUT:
          case EVENT_TYPES.CARD_FIELD_SELECT:
            if (e.field_name) {
              state = {
                ...state,
                card: { ...state.card, [e.field_name]: val },
              };
            }
            break;

          case EVENT_TYPES.TERMS_CHECK:
            state = { ...state, termsChecked: true };
            break;

          case EVENT_TYPES.TERMS_UNCHECK:
            state = { ...state, termsChecked: false };
            break;
        }

        if (e.stage) {
          const mappedPage = STAGE_PAGE_MAP[e.stage];
          if (mappedPage !== undefined) {
            latestPage = mappedPage;
          }
        }
      }

      stateRef.current = state;
      onStateChange(state);

      if (latestPage !== lastPageRef.current) {
        lastPageRef.current = latestPage;
        onPageChange(latestPage);
      }
    },
    [onStateChange, onPageChange],
  );

  const initializeFromSnapshot = useCallback(
    (snapshot: Record<string, any>) => {
      const state = createEmptyShopState();
      if (snapshot.search) state.searchQuery = snapshot.search;
      if (snapshot.product) state.selectedProductSlug = snapshot.product;
      if (snapshot.color) state.selectedColor = snapshot.color;
      if (snapshot.size) state.selectedSize = snapshot.size;
      if (snapshot.quantity) state.quantity = snapshot.quantity;
      if (snapshot.shippingMethod) state.shippingMethod = snapshot.shippingMethod;
      if (snapshot.paymentMethod) state.paymentMethod = snapshot.paymentMethod;
      if (snapshot.termsChecked) state.termsChecked = snapshot.termsChecked;
      if (snapshot.address) {
        state.address = { ...state.address, ...snapshot.address };
      }
      if (snapshot.card) {
        state.card = { ...state.card, ...snapshot.card };
      }
      stateRef.current = state;
      onStateChange(state);
    },
    [onStateChange],
  );

  return { projectEvents, initializeFromSnapshot };
}
