export const POLICY_TYPES = [
  "threat-protection",
  "peripheral-control",
  "application-control",
  "web-control",
  "device-encryption",
  "windows-firewall",
  "agent-updating",
  "endpoint-dns-protection",
  "data-collection-and-investigation",
  "server-threat-protection",
  "server-lockdown",
  "server-web-control",
  "server-application-control",
  "server-peripheral-control",
  "server-windows-firewall",
  "server-agent-updating",
  "server-file-integrity-monitoring",
  "server-linux-runtime-detection",
  "server-data-collection-and-investigation",
] as const;

export const CASE_TYPES = [
  "incident",
  "investigation",
  "hunt",
  "activeThreat",
  "healthCheck",
  "generalRequest",
  "customerRequest",
  "exposure",
  "managedRisk",
  "postureImprovement",
] as const;

export const CASE_SEVERITIES = ["critical", "high", "medium", "low", "informational", "notSet"] as const;
export const CASE_STATUSES = ["new", "investigating", "onHold", "resolved", "actionRequired"] as const;
export const CASE_WRITE_STATUSES = ["new", "investigating", "onHold", "resolved"] as const;

export const MOBILE_ACTIONS = ["sync", "scan", "locate", "lock", "send-message", "unenroll", "wipe"] as const;
export type MobileAction = (typeof MOBILE_ACTIONS)[number];

export type CaseRecord = {
  id: string;
  name?: string;
  type?: string;
  managedBy?: string;
  severity?: string;
  status?: string;
  overview?: string;
  detectionCount?: number;
  verdict?: string;
  escalated?: boolean;
  createdAt?: string;
  assignee?: { email?: string; name?: string } | string;
};

export type Detection = {
  id: string;
  detectionName?: string;
  name?: string;
  attackType?: string;
  detectionRule?: string;
  ruleDescription?: string;
  severity?: number | string;
  type?: string;
  time?: string;
  sensorGeneratedAt?: string;
  sensor?: { type?: string };
  device?: { id?: string; hostname?: string; name?: string };
  mitreAttacks?: Array<{ tactic?: { name?: string }; technique?: { name?: string } }>;
};

export type Policy = {
  id: string;
  name?: string;
  type?: string;
  enabled?: boolean;
  priority?: number;
  lockedByManagingAccount?: boolean;
  settings?: Record<string, unknown>;
};

export type SiemEvent = {
  id?: string;
  name?: string;
  type?: string;
  severity?: string;
  threat?: string;
  source?: string;
  when?: string;
  created_at?: string;
  endpoint_id?: string;
  endpoint_type?: string;
  location?: string;
  group?: string;
  user_id?: string;
};

export type SiemPage = {
  items?: SiemEvent[];
  has_more?: boolean;
  next_cursor?: string;
};

export type MobileDevice = {
  id: string;
  name?: string;
  platform?: string;
  osName?: string;
  modelName?: string;
  managedState?: string;
  healthState?: string;
  compliant?: boolean;
  ownershipType?: string;
  availableActions?: string[];
  lastSeenAt?: string;
  user?: { name?: string; email?: string };
  description?: string;
};

export type ScanResult = {
  id?: string;
  name?: string;
  type?: string;
  identifier?: string;
  threatName?: string;
  detectedAt?: string;
};

export type Mailbox = {
  id: string;
  name?: string;
  email?: string;
  emailAddress?: string;
  type?: string;
};

export type QuarantineMessage = {
  id: string;
  from?: string;
  to?: string | string[];
  forRecipient?: string;
  subject?: string;
  reason?: string | string[];
  quarantinedAt?: string;
  direction?: string;
  productType?: string;
};

export type Firewall = {
  id: string;
  name?: string;
  hostname?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  model?: string;
  externalIpv4Addresses?: string[];
  status?: {
    connected?: boolean;
    suspended?: boolean;
    managingStatus?: string;
    managing?: string;
  };
  group?: { id?: string; name?: string };
};

export type FirewallGroup = {
  id: string;
  name?: string;
  description?: string;
};

export function assigneeLabel(assignee: CaseRecord["assignee"]): string {
  if (!assignee) return "Unassigned";
  if (typeof assignee === "string") return assignee;
  return assignee.name || assignee.email || "Unassigned";
}

export function mailboxAddress(mailbox: Mailbox): string {
  return mailbox.email || mailbox.emailAddress || "No address";
}

export function isBasePolicy(policy: Policy): boolean {
  return policy.priority === 0 || policy.name === "Base Policy";
}

export function readSetting(raw: unknown): { value: unknown; managed: boolean } {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "value" in raw) {
    const record = raw as { value?: unknown; sophosManaged?: boolean };
    return { value: record.value, managed: record.sophosManaged === true };
  }
  return { value: raw, managed: false };
}

export function actionAvailable(actions: string[] | undefined, action: MobileAction): boolean {
  if (!actions || actions.length === 0) return true;
  const wanted = action.replace(/-/g, "").toLowerCase();
  return actions.some((item) => item.replace(/[-_\s]/g, "").toLowerCase() === wanted);
}
