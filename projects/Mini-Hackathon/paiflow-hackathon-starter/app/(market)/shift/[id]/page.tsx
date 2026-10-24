import { notFound } from "next/navigation";
import { publicConfig } from "@/lib/paiflow";
import { ShiftDetail } from "@/components/shift-detail";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-z0-9-]{4,64}$/.test(id)) notFound();
  const config = publicConfig();
  return <ShiftDetail shiftId={id} config={config} />;
}
