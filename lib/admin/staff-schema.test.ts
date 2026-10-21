import { describe, it, expect } from "vitest";
import {
  ASSIGNABLE_ROLE_VALUES,
  staffDraftSchema,
  staffPatchSchema,
  staffFieldErrors,
} from "./staff-schema";

describe("Staff Management Schemas", () => {
  describe("ASSIGNABLE_ROLE_VALUES", () => {
    it("includes admin (Super Admin), call_center, and purchaser", () => {
      expect(ASSIGNABLE_ROLE_VALUES).toContain("admin");
      expect(ASSIGNABLE_ROLE_VALUES).toContain("call_center");
      expect(ASSIGNABLE_ROLE_VALUES).toContain("purchaser");
    });
  });

  describe("staffDraftSchema", () => {
    it("accepts valid draft for Super Admin role", () => {
      const res = staffDraftSchema.safeParse({
        email: "superadmin@carvibe.ae",
        displayName: "Sir Nash",
        role: "admin",
        password: "secretpassword123",
      });
      expect(res.success).toBe(true);
    });

    it("accepts draft with empty password for edit mode preparation", () => {
      const res = staffDraftSchema.safeParse({
        email: "agent@carvibe.ae",
        displayName: "Maricel",
        role: "call_center",
        password: "",
      });
      expect(res.success).toBe(true);
    });

    it("rejects password with fewer than 6 characters if provided", () => {
      const res = staffDraftSchema.safeParse({
        email: "agent@carvibe.ae",
        displayName: "Maricel",
        role: "call_center",
        password: "123",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const errors = staffFieldErrors(res.error);
        expect(errors.password).toBe("Password must be at least 6 characters.");
      }
    });

    it("rejects invalid email", () => {
      const res = staffDraftSchema.safeParse({
        email: "invalid-email",
        displayName: "Maricel",
        role: "call_center",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const errors = staffFieldErrors(res.error);
        expect(errors.email).toBe("Enter a valid email address.");
      }
    });
  });

  describe("staffPatchSchema", () => {
    it("allows updating email, password, and role to admin", () => {
      const res = staffPatchSchema.safeParse({
        email: "newemail@carvibe.ae",
        password: "newpassword456",
        displayName: "Updated Admin",
        role: "admin",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBe("newemail@carvibe.ae");
        expect(res.data.password).toBe("newpassword456");
        expect(res.data.role).toBe("admin");
      }
    });

    it("allows empty password or blank without throwing error", () => {
      const res = staffPatchSchema.safeParse({
        email: "newemail@carvibe.ae",
        password: "",
        displayName: "Updated Admin",
        role: "admin",
      });
      expect(res.success).toBe(true);
    });

    it("allows partial patch with only email", () => {
      const res = staffPatchSchema.safeParse({
        email: "test@carvibe.ae",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBe("test@carvibe.ae");
      }
    });
  });
});
