import { Hero } from "@/components/public/Hero";
import { BrandBrowse } from "@/components/public/BrandBrowse";
import { Contact } from "@/components/public/Contact";
import { FlexibleInspection } from "@/components/public/FlexibleInspection";
import { SellExperience } from "@/components/public/SellExperience";
import { SellerAssurance } from "@/components/public/SellerAssurance";

export default function HomePage() {
  return (
    <>
      <Hero />
      <SellerAssurance />
      <SellExperience />
      <BrandBrowse />
      <FlexibleInspection />
      <Contact />
    </>
  );
}
