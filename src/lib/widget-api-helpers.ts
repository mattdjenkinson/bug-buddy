import { NextResponse } from "next/server";
import { prisma } from "./prisma";

export interface DomainValidationResult {
  isValid: boolean;
  error?: NextResponse;
  project?: {
    id: string;
    allowedDomains?: string[];
    secretKey?: string | null;
  };
}

export interface SecretKeyValidationResult {
  isValid: boolean;
  error?: NextResponse;
  project?: {
    id: string;
  };
}

/**
 * Validates secret key for server actions (returns simple boolean result)
 */
export async function validateSecretKeyForAction(
  projectKey: string,
  secretKey: string | undefined,
): Promise<{ isValid: boolean; projectId?: string }> {
  if (!secretKey) {
    return { isValid: false };
  }

  const project = (await prisma.project.findUnique({
    where: { apiKey: projectKey },
    select: {
      id: true,
      secretKey: true,
    },
  })) as {
    id: string;
    secretKey: string | null;
  } | null;

  if (!project || !project.secretKey) {
    return { isValid: false };
  }

  // Use timing-safe comparison to prevent timing attacks
  if (secretKey !== project.secretKey) {
    return { isValid: false };
  }

  return { isValid: true, projectId: project.id };
}

/**
 * Validates domain for server actions (returns simple boolean result)
 * @param projectKey - The project API key
 * @param url - Optional URL of the page where the widget is embedded (takes precedence over Origin/Referer)
 */
export async function validateDomainForAction(
  projectKey: string,
  url?: string,
): Promise<{ isValid: boolean; error?: string }> {
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const origin = headersList.get("origin");
  const referer = headersList.get("referer");

  const project = await prisma.project.findUnique({
    where: { apiKey: projectKey },
    select: {
      id: true,
      allowedDomains: true,
    },
  });

  if (!project) {
    return { isValid: false, error: "Project not found" };
  }

  const allowedDomains = project.allowedDomains || [];

  // If no allowed domains configured, allow all (backward compatible)
  if (allowedDomains.length === 0) {
    return { isValid: true };
  }

  // Helper function to extract hostname from a URL string
  const extractHostname = (urlString: string): string | null => {
    try {
      const urlObj = new URL(urlString);
      const isLocalhost =
        urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1";
      return isLocalhost ? urlObj.host : urlObj.hostname;
    } catch {
      return null;
    }
  };

  // Try to get the requesting domain from url parameter first (most reliable)
  // then fall back to origin or referer
  let requestHost: string | null = null;

  if (url) {
    requestHost = extractHostname(url);
  }

  if (!requestHost && origin) {
    requestHost = extractHostname(origin);
  }

  if (!requestHost && referer) {
    requestHost = extractHostname(referer);
  }

  // Always allow localhost for development
  const isLocalhost =
    requestHost === "localhost" ||
    requestHost?.startsWith("localhost:") ||
    requestHost === "127.0.0.1" ||
    requestHost?.startsWith("127.0.0.1:");

  if (isLocalhost) {
    return { isValid: true };
  }

  // If we couldn't determine the requesting domain, reject the request
  if (!requestHost) {
    return {
      isValid: false,
      error: "Origin, Referer header, or url parameter required",
    };
  }

  // Helper function to check if a domain matches an allowed domain
  // Supports exact match and subdomain matching (e.g., www.example.com matches example.com)
  const isDomainAllowed = (host: string, allowedDomain: string): boolean => {
    // Remove protocol and trailing slash if present
    const cleanDomain = allowedDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .toLowerCase();
    const cleanHost = host.toLowerCase();

    // Exact match
    if (cleanHost === cleanDomain) {
      return true;
    }

    // Subdomain match: www.example.com should match example.com
    // But example.com should NOT match www.example.com
    if (cleanHost.endsWith(`.${cleanDomain}`)) {
      return true;
    }

    return false;
  };

  // Check if the domain matches any allowed domain
  const isAllowed = allowedDomains.some((domain: string) =>
    isDomainAllowed(requestHost!, domain),
  );

  if (!isAllowed) {
    return { isValid: false, error: "Domain not allowed" };
  }

  return { isValid: true };
}
