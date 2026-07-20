import { UtilityBar } from "@/components/public/UtilityBar";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { PageViewTracker } from "@/components/public/PageViewTracker";
import { brand } from "@/config/brand";

export default function PrivacyPage() {
  return (
    <>
      <PageViewTracker />
      <UtilityBar />
      <Navbar />
      <main className="container pb-16 pt-36 sm:pt-40">
        <h1 className="font-display text-fluid-3 text-text">Privacy Policy</h1>
        <div className="mt-6 max-w-2xl space-y-4 text-fluid-0 text-text-muted">
          <p>
            {brand.name} collects only the information you provide through our valuation form - your name, WhatsApp
            number, car details, and inspection area - so our team can prepare your valuation and contact you.
          </p>
          <p>
            We do not use third-party trackers. Basic visit counts are recorded first-party to understand site usage.
            Your data is never sold or shared with third parties.
          </p>
          <p>
            By submitting the form you consent to be contacted by {brand.name} regarding your valuation, in line with
            UAE Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
