export const brand = {
  name: "CarVibeDubai",
  monogram: "CVD",
  tagline: "DUBAI'S LUXURY CAR VALUATION",
  whatsappNumber: "+971500000000",
  callNumber: "+971500000000",
  notifyEmail: "demo@carvibedubai.com",
  goldHex: "#D4AF37",
  address: "Dubai, UAE",
  hours: "Sat-Thu, 9:00 AM - 9:00 PM",
  credit: "Developed by CREServices Beyond Strategy FZE LLC",
  socials: {
    facebook: "https://www.facebook.com/carvibedubai",
    instagram: "https://www.instagram.com/carvibedubai",
  },
};

export function whatsappLink(message: string, number = brand.whatsappNumber) {
  const digits = number.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
