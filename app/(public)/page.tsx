import { Hero } from "@/components/public/Hero";
import { BodyTypeBrowse } from "@/components/public/BodyTypeBrowse";
import { BrandBrowse } from "@/components/public/BrandBrowse";
import { Contact } from "@/components/public/Contact";
import { FeaturedVehicles } from "@/components/public/FeaturedVehicles";
import { FinancingSection } from "@/components/public/FinancingSection";
import { ReviewsAndFinalCta } from "@/components/public/ReviewsAndFinalCta";
import { SellExperience } from "@/components/public/SellExperience";
import { VehicleDiscovery } from "@/components/public/VehicleDiscovery";
import { WhyChooseUs } from "@/components/public/WhyChooseUs";

export default function HomePage() {
  return (
    <>
      <Hero />
      <VehicleDiscovery />
      <BrandBrowse />
      <FeaturedVehicles />
      <BodyTypeBrowse />
      <SellExperience />
      <WhyChooseUs />
      <FinancingSection />
      <ReviewsAndFinalCta />
      <Contact />
    </>
  );
}
