export type OrderingPermission = "guest" | "registered" | "approval";

export const ORDERING_PERMISSION_LABELS: Record<OrderingPermission, string> = {
  guest: "Guest",
  registered: "Registered Account",
  approval: "Approval Required",
};
