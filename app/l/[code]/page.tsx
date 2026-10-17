import { ListenerStage } from "@/components/listener-stage";
import { normalizeCode } from "@/lib/code";

export default async function ListenerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ListenerStage code={normalizeCode(code)} />;
}
