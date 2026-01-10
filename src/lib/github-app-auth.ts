import { serverEnv } from "@/env";
import { createSign } from "crypto";

type CachedInstallationToken = { token: string; expiresAtMs: number };

const installationTokenCache = new Map<string, CachedInstallationToken>();

function base64UrlEncode(input: string | Buffer) {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function signJwtRS256(payload: Record<string, unknown>, privateKey: string) {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKey);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export function getGitHubAppConfigOrThrow() {
  const appId = serverEnv.GITHUB_APP_ID;
  const privateKeyRaw = serverEnv.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKeyRaw) {
    throw new Error(
      "GitHub App is not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.",
    );
  }

  // Common deployment pattern: store multiline private key with literal \\n.
  const privateKey = privateKeyRaw.includes("\\n")
    ? privateKeyRaw.replaceAll("\\n", "\n")
    : privateKeyRaw;

  return { appId, privateKey };
}

export async function getInstallationAccessToken(installationId: string) {
  const cacheKey = String(installationId);
  const cached = installationTokenCache.get(cacheKey);
  if (cached && cached.expiresAtMs - Date.now() > 60_000) {
    return cached.token;
  }

  const { appId, privateKey } = getGitHubAppConfigOrThrow();

  const nowSeconds = Math.floor(Date.now() / 1000);
  const jwt = signJwtRS256(
    {
      iat: nowSeconds - 30, // small clock skew allowance
      exp: nowSeconds + 9 * 60, // GitHub allows up to 10 minutes
      iss: appId,
    },
    privateKey,
  );

  const tokenResp = await fetch(
    `https://api.github.com/app/installations/${encodeURIComponent(
      installationId,
    )}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!tokenResp.ok) {
    const text = await tokenResp.text().catch(() => "");
    throw new Error(
      `Failed to mint GitHub App installation token (status ${tokenResp.status}). ${text}`,
    );
  }

  const data = (await tokenResp.json()) as {
    token: string;
    expires_at: string;
  };

  const expiresAtMs = Date.parse(data.expires_at);
  installationTokenCache.set(cacheKey, { token: data.token, expiresAtMs });
  return data.token;
}
