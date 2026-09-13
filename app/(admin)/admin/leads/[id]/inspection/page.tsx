"use client";

import { useParams } from "next/navigation";
import { InspectionWorkspace } from "@/components/admin/InspectionWorkspace";

export default function InspectionPage() {
  const params = useParams<{ id: string }>();
  return <InspectionWorkspace leadId={params.id} />;
}
