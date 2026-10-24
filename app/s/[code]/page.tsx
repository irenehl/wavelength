import { SpeakerStage } from "@/components/speaker-stage";
import { normalizeCode } from "@/lib/code";

export default async function SpeakerPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { code } = await params;
  const { name = "" } = await searchParams;
  return <SpeakerStage code={normalizeCode(code)} name={name} />;
}
