import {SystemRole} from "@/contexts/auth/types";

export const SystemRoles = {
  customerSuccess: "customer_success",
  systemAdmin: "system_admin",
} as const;

export const SystemRolesHumanNames: Record<SystemRole, string> = {
  customer_success: "Customer Success",
  system_admin: "System Administrator",
} as const;