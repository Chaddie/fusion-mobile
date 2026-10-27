# Fusion Mobile

Phone-first console for a Sophos Fusion tenant (formerly Sophos Central). It talks to the [Sophos Fusion APIs](https://developer.sophos.com/) so you can read alerts and devices, act on alerts, isolate or delete endpoints, and create, update, or delete directory people and groups.

This is an unofficial companion. It is not affiliated with Sophos Ltd.

## What you can do

- Home: high alerts and devices in bad health
- Alerts: filter by severity and product, then run the actions Sophos allows
- Devices: search, scan, isolate or release, turn tamper protection on or off, rotate a tamper password, delete
- People: search, add, edit, and delete custom directory users
- People groups and device groups: create, rename, add or remove members, delete empty custom groups

Synced Active Directory, Microsoft Entra, and Google records stay read-only here. Sophos expects those changes in the source directory.

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
