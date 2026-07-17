import { Hero } from "@/components/public/Hero";
import { BrandBrowse } from "@/components/public/BrandBrowse";
import { ScrapCars } from "@/components/public/ScrapCars";
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
      <ScrapCars />
      <FlexibleInspection />
    </>
  );
}
