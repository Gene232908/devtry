"use client";

import { createContext, useContext } from "react";
import type { StaffIdentity } from "@/lib/auth/permissions";

/**
 * Provides the resolved staff identity to all admin client components.
 *
 * This context is populated once by the admin layout from server-derived data.
 * Components should NEVER use this as the sole authorization check — the server
 * guard re-derives the identity from the live profile on every request.
 *
 * Use it for conditional rendering (hiding tabs, masking fields) only.
 */
const StaffIdentityContext = createContext<StaffIdentity | null>(null);

export function StaffIdentityProvider({
  identity,
  children,
}: {
  identity: StaffIdentity | null;
  children: React.ReactNode;
}) {
  return (
    <StaffIdentityContext.Provider value={identity}>
      {children}
    </StaffIdentityContext.Provider>
  );
}

/**
 * Returns the current staff identity or null if not yet resolved.
 * Prefer hasCapability(identity, cap) for gating UI elements.
 */
export function useStaffIdentity(): StaffIdentity | null {
  return useContext(StaffIdentityContext);
}
