export type ActionState = {
  error?: string;
  message?: string;
  password?: string;
} | null;

export type PageInfo = {
  fromKey?: string;
  nextKey?: string;
  size?: number;
  maxSize?: number;
  total?: number;
  items?: number;
  current?: number;
};

export type Page<T> = {
  items?: T[];
  pages?: PageInfo;
};

export type Alert = {
  id: string;
  allowedActions?: string[];
  category?: string;
  description?: string;
  groupKey?: string;
  managedAgent?: { id?: string; type?: string };
  person?: { id?: string; name?: string };
  product?: string;
  raisedAt?: string;
  severity?: string;
  tenant?: { id?: string; name?: string };
  type?: string;
  eventCount?: number;
  status?: string;
};

export type Endpoint = {
  id: string;
  type?: string;
  hostname?: string;
  health?: {
    overall?: string;
    threats?: { status?: string };
    services?: { status?: string; serviceDetails?: { name?: string; status?: string }[] };
  };
  os?: { isServer?: boolean; platform?: string; name?: string; build?: number };
  ipv4Addresses?: string[];
  ipv6Addresses?: string[];
  macAddresses?: string[];
  group?: { name?: string; id?: string };
  associatedPerson?: { name?: string; viaLogin?: string; id?: string };
  tamperProtectionSupported?: boolean;
  tamperProtectionEnabled?: boolean;
  assignedProducts?: { code?: string; version?: string; status?: string }[];
  lastSeenAt?: string;
  serialNumber?: string;
  encryption?: { overallStatus?: string };
  online?: boolean;
  isolation?: { status?: string; adminIsolated?: boolean; selfIsolated?: boolean };
};

export type DirectoryUser = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  exchangeLogin?: string;
  domain?: string;
  source?: { type?: string };
  createdAt?: string;
  updatedAt?: string;
  groups?: { total?: number; items?: { id?: string; name?: string; displayName?: string }[] };
  tenant?: { id?: string; name?: string };
};

export type UserGroup = {
  id: string;
  name?: string;
  displayName?: string;
  description?: string;
  source?: { type?: string };
  users?: { total?: number; itemsCount?: number; items?: { id?: string; name?: string }[] };
  createdAt?: string;
  updatedAt?: string;
};

export type EndpointGroup = {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  endpoints?: { total?: number; itemsCount?: number; items?: { id?: string; hostname?: string }[] };
  createdAt?: string;
  updatedAt?: string;
};

export type Session = {
  v: 1;
  clientId: string;
  clientSecret: string;
  tenantId: string;
  idType: "tenant";
  dataRegion: string;
};
