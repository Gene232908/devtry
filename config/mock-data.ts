export type LeadStatus = "new" | "pending" | "contacted" | "valuation_sent" | "closed";

export type Lead = {
  id: string;
  fullName: string;
  phoneE164: string;
  email?: string;
  make: string;
  model: string;
  year: number;
  mileageKm: number;
  condition: "excellent" | "good" | "fair";
  status: LeadStatus;
  estimatedValueAed: number | null;
  notes: string;
  createdAt: string;
  isDuplicate?: boolean;
};

export type LeadEvent = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
};

export const mockLeads: Lead[] = [
  { id: "L-400874", fullName: "Ahmed Al-Mansoori", phoneE164: "+971501234567", email: "ahmed.m@example.com", make: "Lamborghini", model: "Urus", year: 2022, mileageKm: 18000, condition: "excellent", status: "pending", estimatedValueAed: 850000, notes: "", createdAt: "2026-06-25T09:12:00Z" },
  { id: "L-400873", fullName: "Sarah Chen", phoneE164: "+971559876543", email: "sarah.chen@example.com", make: "Mercedes-Benz", model: "E-Class", year: 2019, mileageKm: 62000, condition: "good", status: "contacted", estimatedValueAed: 145000, notes: "Requested call back after 6pm.", createdAt: "2026-06-25T07:40:00Z" },
  { id: "L-400872", fullName: "Khalid Hussain", phoneE164: "+971525551122", email: "", make: "Nissan", model: "Patrol", year: 2022, mileageKm: 31000, condition: "excellent", status: "valuation_sent", estimatedValueAed: 178000, notes: "", createdAt: "2026-06-24T15:05:00Z" },
  { id: "L-400871", fullName: "Mamad Shanoori", phoneE164: "+971559876544", email: "mamad.s@example.com", make: "Ferrari", model: "488", year: 2020, mileageKm: 9500, condition: "excellent", status: "contacted", estimatedValueAed: 720000, notes: "", createdAt: "2026-06-24T11:20:00Z" },
  { id: "L-400870", fullName: "Fatima Al Suwaidi", phoneE164: "+971501112233", email: "", make: "Range Rover", model: "Sport SVR", year: 2021, mileageKm: 41000, condition: "good", status: "new", estimatedValueAed: null, notes: "", createdAt: "2026-06-24T08:00:00Z" },
  { id: "L-400869", fullName: "Omar Al Falasi", phoneE164: "+971567778899", email: "omar.f@example.com", make: "Bentley", model: "Bentayga", year: 2023, mileageKm: 6200, condition: "excellent", status: "pending", estimatedValueAed: 980000, notes: "", createdAt: "2026-06-23T19:42:00Z" },
  { id: "L-400868", fullName: "Layla Hassan", phoneE164: "+971523334455", email: "", make: "Rolls-Royce", model: "Phantom", year: 2023, mileageKm: 3100, condition: "excellent", status: "valuation_sent", estimatedValueAed: 2100000, notes: "VIP client — handle personally.", createdAt: "2026-06-23T14:10:00Z" },
  { id: "L-400867", fullName: "Khalid Hussain", phoneE164: "+971525554535", email: "", make: "Nissan", model: "Patrol", year: 2019, mileageKm: 88000, condition: "fair", status: "pending", estimatedValueAed: 92000, notes: "", createdAt: "2026-06-22T10:33:00Z", isDuplicate: true },
  { id: "L-400866", fullName: "Yusuf Al Marri", phoneE164: "+971501239876", email: "yusuf.m@example.com", make: "Porsche", model: "Cayenne", year: 2020, mileageKm: 55000, condition: "good", status: "closed", estimatedValueAed: 210000, notes: "Deal closed at AED 205,000.", createdAt: "2026-06-21T16:55:00Z" },
  { id: "L-400865", fullName: "Ahmad Al-Mansoori", phoneE164: "+971501234567", email: "", make: "Toyota", model: "Land Cruiser", year: 2021, mileageKm: 47000, condition: "good", status: "contacted", estimatedValueAed: 165000, notes: "", createdAt: "2026-06-21T09:05:00Z" },
];

export const mockLeadEvents: Record<string, LeadEvent[]> = {
  "L-400874": [
    { id: "e1", type: "lead_created", message: "Lead submitted via website valuation form.", createdAt: "2026-06-25T09:12:00Z" },
    { id: "e2", type: "status_change", message: "Status changed: new → pending", createdAt: "2026-06-25T09:30:00Z" },
  ],
};

export const visitorsSeries = [
  { day: "Mon", visitors: 980 },
  { day: "Tue", visitors: 1120 },
  { day: "Wed", visitors: 1340 },
  { day: "Thu", visitors: 1080 },
  { day: "Fri", visitors: 1510 },
  { day: "Sat", visitors: 1330 },
  { day: "Sun", visitors: 1385 },
];

export const submissionsSeries = [
  { day: "Mon", submissions: 32 },
  { day: "Tue", submissions: 41 },
  { day: "Wed", submissions: 53 },
  { day: "Thu", submissions: 38 },
  { day: "Fri", submissions: 62 },
  { day: "Sat", submissions: 47 },
  { day: "Sun", submissions: 39 },
];

export function computeStats(leads: Lead[]) {
  const today = new Date().toISOString().slice(0, 10);
  const totalLeads = leads.length;
  const newToday = leads.filter((l) => l.createdAt.slice(0, 10) === today).length;
  const activeLeads = leads.filter((l) => l.status === "pending" || l.status === "contacted").length;
  const visitorsThisWeek = visitorsSeries.reduce((sum, d) => sum + d.visitors, 0);
  const valued = leads.filter((l) => l.estimatedValueAed != null);
  const averageValue = valued.length
    ? Math.round(valued.reduce((sum, l) => sum + (l.estimatedValueAed ?? 0), 0) / valued.length)
    : 0;
  const whatsappClicks = 615;
  return { totalLeads, newToday, activeLeads, visitorsThisWeek, averageValue, whatsappClicks };
}
