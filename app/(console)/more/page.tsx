import { PageHeader } from "@/components/ui";

export const metadata = { title: "More" };

const links = [
  { href: "/detections", title: "Detections", lede: "Events from the last 24 hours." },
  { href: "/policies", title: "Policies", lede: "Turn endpoint and server policies on, and change settings." },
  { href: "/phones", title: "Phones", lede: "Sophos Mobile devices, scans, lock, and wipe." },
  { href: "/email", title: "Email", lede: "Mailboxes and quarantine." },
  { href: "/firewalls", title: "Firewalls", lede: "Appliances and firewall groups." },
  { href: "/people", title: "People", lede: "Directory users." },
  { href: "/groups", title: "People groups", lede: "Create groups and change who is in them." },
  { href: "/device-groups", title: "Device groups", lede: "Organise computers and servers." },
  { href: "/settings", title: "Settings", lede: "See this tenant and sign out." },
];

export default function MorePage() {
  return (
    <div>
      <PageHeader title="More" lede="The rest of the tenant, still one tap away." />
      <div className="list">
        {links.map((link) => (
          <a className="item" key={link.href} href={link.href}>
            <span className="item-main">
              <span className="item-title">{link.title}</span>
              <span className="item-sub">{link.lede}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
