import type { NextConfig } from "next";

import "./src/env/client";
import "./src/env/server";

const nextConfig: NextConfig = {
  transpilePackages: ["@prisma/client"],
};

export default nextConfig;
