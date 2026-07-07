import { UtilityBar } from "@/components/public/UtilityBar";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { ValuationModal } from "@/components/public/ValuationModal";
import { PageIntro } from "@/components/public/PageIntro";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageIntro>
      <UtilityBar />
      <Navbar />
      <main>{children}</main>
      <Footer />
      <ValuationModal />
    </PageIntro>
  );
}
