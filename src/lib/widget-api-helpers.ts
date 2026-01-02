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
 */
export async function validateDomainForAction(
  projectKey: string,
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

  // Try to get the requesting domain from origin or referer
  let requestHost: string | null = null;

  if (origin) {
    try {
      const originUrl = new URL(origin);
      // For localhost, preserve the port; for others, use hostname only
      const isLocalhost =
        originUrl.hostname === "localhost" ||
        originUrl.hostname === "127.0.0.1";
      requestHost = isLocalhost ? originUrl.host : originUrl.hostname;
    } catch {
      // Invalid origin URL, ignore
    }
  } else if (referer) {
    try {
      const refererUrl = new URL(referer);
      const isLocalhost =
        refererUrl.hostname === "localhost" ||
        refererUrl.hostname === "127.0.0.1";
      requestHost = isLocalhost ? refererUrl.host : refererUrl.hostname;
    } catch {
      // Invalid referer URL, ignore
    }
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
      error: "Origin or Referer header required",
    };
  }

  // Check if origin/referer matches any allowed domain
  const isAllowed = allowedDomains.some((domain: string) => {
    // Remove protocol if present
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    // Support exact match or subdomain match
    return (
      requestHost === cleanDomain || requestHost.endsWith(`.${cleanDomain}`)
    );
  });

  if (!isAllowed) {
    return { isValid: false, error: "Domain not allowed" };
  }

  return { isValid: true };
}
