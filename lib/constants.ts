export const SESSION_COOKIE = "fm_session";

export const ALERT_ACTIONS = [
  "acknowledge",
  "cleanPua",
  "cleanVirus",
  "authPua",
  "clearThreat",
  "clearHmpa",
  "sendMsgPua",
  "sendMsgThreat",
] as const;

export type AlertAction = (typeof ALERT_ACTIONS)[number];

export const ALERT_ACTION_LABELS: Record<AlertAction, string> = {
  acknowledge: "Acknowledge",
  cleanPua: "Clean PUA",
  cleanVirus: "Clean virus",
  authPua: "Allow PUA",
  clearThreat: "Clear threat",
  clearHmpa: "Clear exploit trace",
  sendMsgPua: "Send PUA message",
  sendMsgThreat: "Send threat message",
};

export const SEVERITIES = ["high", "medium", "low"] as const;
export const HEALTH = ["bad", "suspicious", "good", "unknown"] as const;
export const ENDPOINT_TYPES = ["computer", "server"] as const;
export const SOURCE_TYPES = ["custom", "activeDirectory", "azureActiveDirectory", "googleDirectory"] as const;

export const SOURCE_LABELS: Record<(typeof SOURCE_TYPES)[number], string> = {
  custom: "Custom",
  activeDirectory: "Active Directory",
  azureActiveDirectory: "Microsoft Entra",
  googleDirectory: "Google",
};

export const PRODUCT_LABELS: Record<string, string> = {
  other: "Other",
  endpoint: "Endpoint",
  server: "Server",
  mobile: "Mobile",
  encryption: "Encryption",
  emailGateway: "Email",
  webGateway: "Web",
  phishThreat: "Phish Threat",
  wireless: "Wireless",
  firewall: "Firewall",
  ztna: "ZTNA",
  cswitch: "Switch",
  secureWebservice: "Secure web",
  coreAgent: "Core agent",
  interceptX: "Intercept X",
  xdr: "XDR",
  endpointProtection: "Endpoint protection",
  deviceEncryption: "Device encryption",
  mtr: "MDR",
};
