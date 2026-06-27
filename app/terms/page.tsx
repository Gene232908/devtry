import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { brand } from "@/config/brand";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="container py-16">
        <h1 className="font-display text-fluid-3 text-text">Terms of Service</h1>
        <div className="mt-6 max-w-2xl space-y-4 text-fluid-0 text-text-muted">
          <p>
            Valuations provided by {brand.name} are estimates based on the information you submit and are subject to
            confirmation following a physical inspection.
          </p>
          <p>No price is published on this website. Final offers are communicated directly via WhatsApp or call.</p>
          <p>By using this site you agree to provide accurate information for the valuation request.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
