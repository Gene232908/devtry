import { describe, expect, it } from "vitest";
import {
  calculateExpensesSummary,
  demoExpenses,
  formatExpenseCsv,
  type CompanyExpenseItem,
} from "./expenses";

describe("Expenses calculations and CSV generation", () => {
  it("calculates accurate expense summaries across vehicles", () => {
    const summary = calculateExpensesSummary(demoExpenses);

    expect(summary.totalCount).toBe(demoExpenses.length);
    expect(summary.totalExpensesAed).toBeGreaterThan(0);
    expect(summary.thisMonthExpensesAed).toBeGreaterThanOrEqual(0);
    expect(summary.thisMonthLabel).toBeTruthy();
    expect(summary.uniqueVehiclesCount).toBeGreaterThan(0);
    expect(summary.averagePerVehicleAed).toBe(
      Math.round((summary.totalExpensesAed / summary.uniqueVehiclesCount) * 100) / 100,
    );
    expect(summary.valuationExpensesAed + summary.scrapExpensesAed).toBe(summary.totalExpensesAed);
  });

  it("handles empty expense arrays cleanly", () => {
    const summary = calculateExpensesSummary([]);

    expect(summary.totalCount).toBe(0);
    expect(summary.totalExpensesAed).toBe(0);
    expect(summary.thisMonthExpensesAed).toBe(0);
    expect(summary.thisMonthCount).toBe(0);
    expect(summary.uniqueVehiclesCount).toBe(0);
    expect(summary.averagePerVehicleAed).toBe(0);
    expect(summary.valuationExpensesAed).toBe(0);
    expect(summary.scrapExpensesAed).toBe(0);
  });

  it("exports valid CSV without redundant currency prefixes in numeric amount column", () => {
    const testItems: CompanyExpenseItem[] = [
      {
        id: "exp-test-1",
        inventoryId: "INV-101",
        leadId: "L-101",
        description: "Recovery flatbed",
        amountAed: 450,
        createdAt: "2026-10-20T10:00:00Z",
        updatedAt: "2026-10-20T10:00:00Z",
        createdById: "user-1",
        createdByName: "Purchaser One",
        createdByRole: "purchaser",
        vehicle: {
          make: "Toyota",
          model: "Land Cruiser",
          year: 2022,
          trim: "VXR",
          chassisNumber: "CH-1234",
          status: "in_stock",
          inquiryType: "valuation",
          purchasePriceAed: 150000,
          salePriceAed: null,
        },
        customerName: "Omar Test",
      },
    ];

    const csv = formatExpenseCsv(testItems);
    expect(csv).toContain("Expense ID");
    expect(csv).toContain('"450.00"');
    expect(csv).not.toContain('"AED 450.00"'); // Ensures no redundant AED in numeric cells
    expect(csv).toContain('"VALUATION"');
  });

  it("filters expenses by time period correctly (day, weekly, monthly, yearly)", async () => {
    const { filterExpensesByPeriod } = await import("./expenses");
    const refDate = new Date("2026-10-21T10:00:00Z");

    const sampleItems: CompanyExpenseItem[] = [
      {
        id: "exp-today",
        inventoryId: "INV-1",
        leadId: "L-1",
        description: "Today expense",
        amountAed: 100,
        createdAt: "2026-10-21T08:00:00Z",
        updatedAt: "2026-10-21T08:00:00Z",
        createdById: "u-1",
        createdByName: "User 1",
        createdByRole: "admin",
        vehicle: {
          make: "Toyota",
          model: "Land Cruiser",
          year: 2022,
          trim: null,
          chassisNumber: null,
          status: "in_stock",
          inquiryType: "valuation",
          purchasePriceAed: 100000,
          salePriceAed: null,
        },
      },
      {
        id: "exp-earlier-this-week",
        inventoryId: "INV-2",
        leadId: "L-2",
        description: "Earlier this week expense",
        amountAed: 200,
        createdAt: "2026-10-19T08:00:00Z",
        updatedAt: "2026-10-19T08:00:00Z",
        createdById: "u-1",
        createdByName: "User 1",
        createdByRole: "admin",
        vehicle: {
          make: "Nissan",
          model: "Patrol",
          year: 2021,
          trim: null,
          chassisNumber: null,
          status: "in_stock",
          inquiryType: "valuation",
          purchasePriceAed: 90000,
          salePriceAed: null,
        },
      },
      {
        id: "exp-earlier-this-month",
        inventoryId: "INV-3",
        leadId: "L-3",
        description: "Earlier this month expense",
        amountAed: 300,
        createdAt: "2026-10-02T08:00:00Z",
        updatedAt: "2026-10-02T08:00:00Z",
        createdById: "u-1",
        createdByName: "User 1",
        createdByRole: "admin",
        vehicle: {
          make: "Porsche",
          model: "Cayenne",
          year: 2020,
          trim: null,
          chassisNumber: null,
          status: "in_stock",
          inquiryType: "valuation",
          purchasePriceAed: 120000,
          salePriceAed: null,
        },
      },
      {
        id: "exp-last-year",
        inventoryId: "INV-4",
        leadId: "L-4",
        description: "Last year expense",
        amountAed: 400,
        createdAt: "2025-05-15T08:00:00Z",
        updatedAt: "2025-05-15T08:00:00Z",
        createdById: "u-1",
        createdByName: "User 1",
        createdByRole: "admin",
        vehicle: {
          make: "BMW",
          model: "X5",
          year: 2019,
          trim: null,
          chassisNumber: null,
          status: "in_stock",
          inquiryType: "valuation",
          purchasePriceAed: 80000,
          salePriceAed: null,
        },
      },
    ];

    const dayItems = filterExpensesByPeriod(sampleItems, "day", refDate);
    expect(dayItems.length).toBe(1);
    expect(dayItems[0].id).toBe("exp-today");

    const weeklyItems = filterExpensesByPeriod(sampleItems, "weekly", refDate);
    expect(weeklyItems.length).toBe(2);

    const monthlyItems = filterExpensesByPeriod(sampleItems, "monthly", refDate);
    expect(monthlyItems.length).toBe(3);

    const yearlyItems = filterExpensesByPeriod(sampleItems, "yearly", refDate);
    expect(yearlyItems.length).toBe(3);

    const allItems = filterExpensesByPeriod(sampleItems, "all", refDate);
    expect(allItems.length).toBe(4);
  });

  it("generates a valid, well-formed PDF document blob containing expenses data only", async () => {
    const { generateExpensesPdfBlob } = await import("./expenses");
    const blob = await generateExpensesPdfBlob(demoExpenses, {
      periodLabel: "October 2026",
      totalAed: 2200,
    });

    expect(blob).toBeDefined();
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1000);
  });
});
