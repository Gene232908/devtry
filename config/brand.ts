export const brand = {
  name: "CarVibeDubai",
  monogram: "CVD",
  tagline: "DUBAI'S LUXURY CAR VALUATION",
  whatsappNumber: "+971501234567",
  callNumber: "+971501234567",
  notifyEmail: "owner@carvibedubai.com",
  goldHex: "#D4AF37",
  address: "Sheikh Zayed Road, Dubai, UAE",
  hours: "Sat–Thu, 9:00 AM – 9:00 PM",
  credit: "Developed by CREServices Beyond Strategy FZE LLC",
};

export function whatsappLink(message: string, number = brand.whatsappNumber) {
  const digits = number.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
