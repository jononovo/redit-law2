import { coreMethods } from "./core";
import { webhookMethods } from "./agent-interaction/webhooks";
import { notificationMethods } from "./platform-management/notifications";
import { pairingWaitlistMethods } from "./payment-rails/payment-links";
import { rail1Methods } from "./payment-rails/rail1";
import { rail2Methods } from "./payment-rails/rail2";
import { ownerMethods } from "./platform-management/owners";
import { masterGuardrailMethods } from "./agent-interaction/master-guardrails";
import { rail5GuardrailMethods } from "./payment-rails/rail5-guardrails";
import { procurementControlMethods } from "./agent-interaction/procurement-controls";
import { rail5Methods } from "./payment-rails/rail5";
import { approvalMethods } from "./agent-interaction/approvals";
import { orderMethods } from "./agent-interaction/orders";
import { salesMethods } from "./agent-shops/sales";
import { brandLoginAccountMethods } from "./brand-engine/brand-login-accounts";
import { shippingAddressMethods } from "./agent-interaction/shipping-addresses";
import { sellerProfileMethods } from "./agent-shops/seller-profiles";
import { invoiceMethods } from "./agent-shops/invoices";
import { basePayMethods } from "./agent-shops/base-pay";
import { qrPayMethods } from "./agent-shops/qr-pay";
import { botMessageMethods } from "./platform-management/bot-messages";
import { brandIndexMethods } from "./brand-engine/brand-index";
import { brandCategoryMethods } from "./brand-engine/brand-categories";
import { brandClaimMethods } from "./brand-engine/brand-claims";
import { brandFeedbackMethods } from "./brand-engine/brand-feedback";
import { agentTestingMethods } from "@/features/agent-testing/storage/agent-testing-storage";
import type { IStorage } from "./types";

export type { IStorage };

export const storage: IStorage = {
  ...coreMethods,
  ...webhookMethods,
  ...notificationMethods,
  ...pairingWaitlistMethods,
  ...rail1Methods,
  ...rail2Methods,
  ...ownerMethods,
  ...masterGuardrailMethods,
  ...rail5GuardrailMethods,
  ...procurementControlMethods,
  ...rail5Methods,
  ...approvalMethods,
  ...orderMethods,
  ...salesMethods,
  ...brandLoginAccountMethods,
  ...shippingAddressMethods,
  ...sellerProfileMethods,
  ...invoiceMethods,
  ...basePayMethods,
  ...qrPayMethods,
  ...botMessageMethods,
  ...brandIndexMethods,
  ...brandCategoryMethods,
  ...brandClaimMethods,
  ...brandFeedbackMethods,
  ...agentTestingMethods,
};
