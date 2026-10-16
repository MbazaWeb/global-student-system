export type PortalRole =
  | "student"
  | "parent_guardian"
  | "institution_admin"
  | "bank_admin"
  | "bank_officer"
  | "platform_admin"
  | "support_agent"
  | "support_lead";

export type VerificationStatus = "pending" | "verified" | "rejected" | "review_required";

export type SupportCaseStatus = "open" | "in_progress" | "awaiting_student" | "resolved" | "closed" | "refunded";
export type SupportCasePriority = "low" | "normal" | "high" | "urgent";
export type RefundRequestStatus = "pending" | "approved" | "rejected" | "processed";
export type NoteVisibility = "internal" | "student";
export type IntegrationKind = "mobile_money" | "bank" | "institution_registry" | "sms" | "email" | "other";
export type IntegrationStatus = "proposed" | "sandbox" | "live" | "disabled";
