import type { StaffRole } from "@/lib/auth/permissions";

export type StaffOption = {
  id: string;
  name: string;
  role: StaffRole;
  isActive: boolean;
};

export type LeadAssignment = {
  callCenterId: string | null;
  purchaserId: string | null;
};
