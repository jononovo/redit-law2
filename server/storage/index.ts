import { coreMethods } from "./core";
import { webhookMethods } from "./webhooks";
import { notificationMethods } from "./notifications";
import { paymentLinkMethods } from "./payment-links";
import { rail4Methods } from "./rail4";
import { rail1Methods } from "./rail1";
import { rail2Methods } from "./rail2";
import { ownerMethods } from "./owners";
import { masterGuardrailMethods } from "./master-guardrails";
import { rail4GuardrailMethods } from "./rail4-guardrails";
import { rail5GuardrailMethods } from "./rail5-guardrails";
import { procurementControlMethods } from "./procurement-controls";
import { skillMethods } from "./skills";
import { rail5Methods } from "./rail5";
import { approvalMethods } from "./approvals";
import { orderMethods } from "./orders";
import { salesMethods } from "./sales";
import { vendorMethods } from "./vendors";
import { shippingAddressMethods } from "./shipping-addresses";
import { sellerProfileMethods } from "./seller-profiles";
import { invoiceMethods } from "./invoices";
import { basePayMethods } from "./base-pay";
import { qrPayMethods } from "./qr-pay";
import { botMessageMethods } from "./bot-messages";
import type { IStorage } from "./types";

export type { IStorage };

export const storage: IStorage = {
  ...coreMethods,
  ...webhookMethods,
  ...notificationMethods,
  ...paymentLinkMethods,
  ...rail4Methods,
  ...rail1Methods,
  ...rail2Methods,
  ...ownerMethods,
  ...masterGuardrailMethods,
  ...rail4GuardrailMethods,
  ...rail5GuardrailMethods,
  ...procurementControlMethods,
  ...skillMethods,
  ...rail5Methods,
  ...approvalMethods,
  ...orderMethods,
  ...salesMethods,
  ...vendorMethods,
  ...shippingAddressMethods,
  ...sellerProfileMethods,
  ...invoiceMethods,
  ...basePayMethods,
  ...qrPayMethods,
  ...botMessageMethods,
};
