# Fusion Mobile

Phone-first console for a Sophos Fusion tenant (formerly Sophos Central). It talks to the [Sophos Fusion APIs](https://developer.sophos.com/) so you can work with alerts, cases, detections, policies, devices, mobile, email, and firewalls from a phone.

This is an unofficial companion. It is not affiliated with Sophos Ltd. The mark is original. It does not use the Sophos logo.

## What you can do

- Home: high alerts, devices in bad health, and cases that need action
- Alerts: filter by severity and product, then run the actions Sophos allows
- Cases: create and update investigations, and open the detections on a case
- Detections: the last 24 hours of SIEM events
- Devices: search, scan, isolate or release, turn tamper protection on or off, rotate a tamper password, delete
- Policies: create endpoint and server policies, enable them, and change individual settings
- Phones: Sophos Mobile devices, scan results, sync, scan, locate, lock, message, unenroll, and wipe
- Email: mailboxes, and quarantine search, release, and delete
- Firewalls: list, rename, delete, and manage firewall groups
- People and groups: directory users, people groups, and device groups

Synced Active Directory, Microsoft Entra, and Google records stay read-only here. Sophos expects those changes in the source directory.

Mobile, Email, Firewall, and Cases only return data when that product is turned on for the tenant. Sophos Mobile itself is offered in a subset of regions.

## Connect a tenant

1. Sign in to [Sophos Fusion Admin](https://central.sophos.com/manage) as a Super Admin.
2. Open **Global Settings → API Credentials** and add a credential.
3. Copy the client ID and client secret.
4. Paste them into Fusion Mobile. They are stored only in an encrypted cookie on that browser for 12 hours.

Create the credential inside the tenant. Partner and organization credentials are refused.

## Run it locally

```bash
npm install
cp .env.example .env.local
```

Set `SESSION_SECRET` in `.env.local` to a random string of at least 32 characters. Optionally set `SOPHOS_CLIENT_ID` and `SOPHOS_CLIENT_SECRET` if you want a "saved credentials" button instead of pasting them.

```bash
npm run dev
```

Open http://localhost:3000.

## Security

- The client secret never goes back to the browser after connect. API calls run on the server.
- Requests are limited to `id.sophos.com` and `api*.central.sophos.com`.
- Sign out on a shared phone. If a device is lost, delete that API credential in Sophos Fusion Admin.
- Keep `SESSION_SECRET` private. Anyone with that secret can decrypt session cookies.
