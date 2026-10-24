import { ListenerStage } from "@/components/listener-stage";
import { normalizeCode } from "@/lib/code";

export default async function ListenerPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { code } = await params;
  const { name = "" } = await searchParams;
  return <ListenerStage code={normalizeCode(code)} name={name} />;
}
