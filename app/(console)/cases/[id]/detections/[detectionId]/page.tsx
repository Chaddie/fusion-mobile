import { notFound } from "next/navigation";
import { BackLink, Banner, Fact, PageHeader } from "@/components/ui";
import { formatWhen, labelize } from "@/lib/format";
import type { Detection } from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import { isCaseId, isDetectionId } from "@/lib/validate";

export const metadata = { title: "Detection" };

export default async function DetectionPage({ params }: { params: Promise<{ id: string; detectionId: string }> }) {
  const { id, detectionId } = await params;
  if (!isCaseId(id) || !isDetectionId(detectionId)) notFound();
  const session = await requireSession();

  let detection: Detection | null = null;
  let error: string | null = null;
  try {
    detection = await sophos<Detection>(session, `/cases/v1/cases/${id}/detections/${detectionId}`);
  } catch (caught) {
    if (caught instanceof SophosError && caught.status === 404) notFound();
    error = caught instanceof SophosError ? caught.message : "This detection could not be loaded.";
  }

  if (!detection) {
    return (
      <div>
        <BackLink href={`/cases/${id}`}>Case</BackLink>
        <Banner tone="bad">{error || "This detection could not be loaded."}</Banner>
      </div>
    );
  }

  const tactics = (detection.mitreAttacks ?? [])
    .map((item) => item.technique?.name || item.tactic?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="stack">
      <BackLink href={`/cases/${id}`}>Case</BackLink>
      <PageHeader title={detection.detectionName || detection.name || "Detection"} lede={detection.ruleDescription || detection.detectionRule} />
      <dl className="facts">
        <Fact label="Severity">{String(detection.severity ?? "Unknown")}</Fact>
        <Fact label="Sensor">{labelize(detection.sensor?.type)}</Fact>
        <Fact label="When">{formatWhen(detection.time || detection.sensorGeneratedAt)}</Fact>
        <Fact label="Device">{detection.device?.hostname || detection.device?.name || "Unknown"}</Fact>
        <Fact label="Attack">{labelize(detection.attackType, "Not set")}</Fact>
        <Fact label="MITRE">{tactics || "None listed"}</Fact>
      </dl>
    </div>
  );
}
