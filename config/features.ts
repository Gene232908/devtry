export const features = {
  buyACar: false,
  uaeOnlyPhone: true,
  turnstile: false,
  visibleStats: [
    "totalLeads",
    "newToday",
    "activeLeads",
    "visitorsThisWeek",
    "averageValue",
    "whatsappClicks",
  ] as const,
  sidebar: {
    enabled: ["dashboard", "leads", "settings"] as const,
    comingSoon: ["analytics", "inventory", "users", "website"] as const,
  },
};
