import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SNAB",
    short_name: "SNAB",
    description: "Find the good stuff hiding nearby.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3e8",
    theme_color: "#f7f3e8",
    icons: [],
  };
}
