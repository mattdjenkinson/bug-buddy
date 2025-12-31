import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

import "./src/env/client";
import "./src/env/server";

const nextConfig: NextConfig = {
  transpilePackages: ["@prisma/client"],
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default withWorkflow(nextConfig);
