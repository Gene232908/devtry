import { UtilityBar } from "@/components/public/UtilityBar";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { ValuationModal } from "@/components/public/ValuationModal";
import { PageIntro } from "@/components/public/PageIntro";
import { PageViewTracker } from "@/components/public/PageViewTracker";
import { getPublicLeadVerificationMode } from "@/lib/server/public-lead-verification";

export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageIntro>
      <PageViewTracker />
      <UtilityBar />
      <Navbar />
      <main>{children}</main>
      <Footer />
      <ValuationModal verificationMode={getPublicLeadVerificationMode()} />
    </PageIntro>
  );
}
