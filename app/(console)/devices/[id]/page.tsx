import { notFound } from "next/navigation";
import { deleteEndpoint } from "@/app/actions";
import { DeviceActions } from "@/components/device-actions";
import { DangerZone } from "@/components/forms";
import { BackLink, Fact, PageHeader, Pill } from "@/components/ui";
import { PRODUCT_LABELS } from "@/lib/constants";
import { formatWhen, labelize } from "@/lib/format";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Endpoint } from "@/lib/types";
import { isUuid } from "@/lib/validate";

export const metadata = { title: "Device" };

export default async function DevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await requireSession();
  let device: Endpoint;
  try {
    device = await sophos<Endpoint>(session, `/endpoint/v1/endpoints/${id}`, { query: { view: "full" } });
  } catch (error) {
    if (error instanceof SophosError && error.status === 404) notFound();
    throw error;
  }

  const isolated = device.isolation?.status === "isolated";
  const hostname = device.hostname || "DELETE";
  const ips = device.ipv4Addresses ?? [];
  const services = device.health?.services?.serviceDetails ?? [];

  return (
    <div className="stack">
      <BackLink href="/devices">Devices</BackLink>
      <PageHeader title={device.hostname || "Unnamed device"} lede={device.os?.name || labelize(device.type)} />
      <div className="row">
        <Pill tone={device.health?.overall}>{labelize(device.health?.overall, "Unknown")}</Pill>
        <Pill tone={device.online === true ? "good" : device.online === false ? "warn" : "unknown"}>
          {device.online === true ? "Online" : device.online === false ? "Offline" : "Unknown"}
        </Pill>
        {isolated ? <Pill tone="bad">Isolated</Pill> : null}
      </div>

      <DeviceActions
        id={device.id}
        isolated={isolated}
        tamperEnabled={Boolean(device.tamperProtectionEnabled)}
        tamperSupported={Boolean(device.tamperProtectionSupported)}
      />

      <section className="card">
        <dl className="facts">
          <Fact label="Last seen">{formatWhen(device.lastSeenAt)}</Fact>
          <Fact label="Person">
            {device.associatedPerson?.id && isUuid(device.associatedPerson.id) ? (
              <a href={`/people/${device.associatedPerson.id}`}>{device.associatedPerson.name || device.associatedPerson.viaLogin}</a>
            ) : (
              device.associatedPerson?.name || device.associatedPerson?.viaLogin || "None"
            )}
          </Fact>
          <Fact label="Group">
            {device.group?.id && isUuid(device.group.id) ? (
              <a href={`/device-groups/${device.group.id}`}>{device.group.name || "Group"}</a>
            ) : (
              device.group?.name || "None"
            )}
          </Fact>
          <Fact label="IPv4">{ips.length ? ips.slice(0, 3).join(", ") : "None reported"}</Fact>
          <Fact label="Threats">{labelize(device.health?.threats?.status, "Unknown")}</Fact>
          <Fact label="Services">{labelize(device.health?.services?.status, "Unknown")}</Fact>
          {device.encryption?.overallStatus ? <Fact label="Encryption">{labelize(device.encryption.overallStatus)}</Fact> : null}
        </dl>
      </section>

      {services.length ? (
        <section className="card stack">
          <h2>Services</h2>
          {services.map((service) => (
            <div className="member" key={service.name}>
              <span>{service.name}</span>
              <Pill tone={service.status === "running" ? "good" : "bad"}>{labelize(service.status)}</Pill>
            </div>
          ))}
        </section>
      ) : null}

      <details className="card more">
        <summary>More details</summary>
        <dl className="facts">
          <Fact label="Platform">{labelize(device.os?.platform)}</Fact>
          <Fact label="Type">{labelize(device.type)}</Fact>
          {device.serialNumber ? <Fact label="Serial">{device.serialNumber}</Fact> : null}
          {(device.macAddresses ?? []).length ? <Fact label="MAC">{device.macAddresses?.join(", ")}</Fact> : null}
          {(device.ipv6Addresses ?? []).length ? <Fact label="IPv6">{device.ipv6Addresses?.slice(0, 2).join(", ")}</Fact> : null}
          <Fact label="Products">
            {(device.assignedProducts ?? []).length
              ? device.assignedProducts
                  ?.map((product) => `${PRODUCT_LABELS[product.code || ""] || labelize(product.code)} ${product.version || ""}`.trim())
                  .join(", ")
              : "None reported"}
          </Fact>
          {isolated ? (
            <Fact label="Isolation source">
              {device.isolation?.adminIsolated ? "Admin" : ""}
              {device.isolation?.selfIsolated ? " Self-isolated" : ""}
            </Fact>
          ) : null}
        </dl>
      </details>

      <DangerZone
        action={deleteEndpoint}
        hidden={{ id: device.id }}
        confirmValue={hostname}
        button="Delete device"
        warning="This removes the device from Sophos. Protection stops until the agent is installed again."
      />
    </div>
  );
}
