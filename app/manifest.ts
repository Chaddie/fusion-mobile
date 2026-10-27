import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fusion Mobile",
    short_name: "Fusion",
    description: "Phone-first console for a Sophos Fusion tenant.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A143A",
    theme_color: "#0A143A",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
