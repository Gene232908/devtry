import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { ValuationModal } from "@/components/public/ValuationModal";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <ValuationModal />
    </>
  );
}
