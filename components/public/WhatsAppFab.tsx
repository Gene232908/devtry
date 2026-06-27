"use client";

import { MessageCircle } from "lucide-react";
import { brand, whatsappLink } from "@/config/brand";

export function WhatsAppFab() {
  function logClick() {
    // mocked: would POST /api/events { type: 'whatsapp_click' } against the real backend
    if (process.env.NODE_ENV === "development") {
      console.info("[event] whatsapp_click");
    }
  }

  return (
    <a
      href={whatsappLink("Hi, I'd like to chat about my car valuation.")}
      target="_blank"
      rel="noopener noreferrer"
      onClick={logClick}
      aria-label={`Chat with ${brand.name} on WhatsApp`}
      className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-success px-3 py-3 text-white shadow-[0_8px_24px_-6px_rgba(52,199,123,.6)] transition-transform hover:scale-105 animate-pulse-glow sm:px-4"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="hidden text-fluid--1 font-medium sm:inline">Chat on WhatsApp</span>
    </a>
  );
}
