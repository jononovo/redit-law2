import type { FullShopScenarioConfig, CardDetails } from "../shared/types";
import { FULL_SHOP_SCENARIO_TEMPLATES } from "../shared/scenario-definitions";
import { generateTestShippingAddress } from "./address-generator";
import { generateTestCardData } from "../../test-card-generator";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickRandomScenario(): FullShopScenarioConfig {
  const template = pick(FULL_SHOP_SCENARIO_TEMPLATES);

  const address = generateTestShippingAddress();

  const rawCard = generateTestCardData();
  const cardDetails: CardDetails = {
    cardholderName: rawCard.cardholderName,
    cardNumber: rawCard.cardNumber,
    cardExpiry: rawCard.cardExpiry,
    cardCvv: rawCard.cardCvv,
    billingZip: rawCard.billingZip,
  };

  return {
    ...template,
    expectedShippingAddress: address,
    expectedCardDetails: cardDetails,
  };
}
