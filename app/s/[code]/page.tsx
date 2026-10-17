import { SpeakerStage } from "@/components/speaker-stage";
import { normalizeCode } from "@/lib/code";

export default async function SpeakerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <SpeakerStage code={normalizeCode(code)} />;
}
