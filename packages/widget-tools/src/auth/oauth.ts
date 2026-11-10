/**
 * `teacharium login`: OAuth 2.1 authorization code flow with PKCE and a
 * loopback redirect (RFC 8252), against the authorization server the
 * Teacharium API advertises (RFC 9728 protected resource metadata).
 * The client registers itself dynamically (RFC 7591) on each login, so no
 * client secret ships with the CLI.
 */
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import {
  getSession,
  normalizeApiUrl,
  saveSession,
  type StoredSession,
} from "./credentials.js";

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
/** Refresh a little before the access token actually expires. */
const EXPIRY_MARGIN_MS = 60 * 1000;

interface AuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `${init?.method ?? "GET"} ${url} failed (${response.status}): ${text.slice(0, 500)}`,
    );
  }
  return JSON.parse(text) as T;
}

export async function discoverAuthServer(
  apiUrl: string,
): Promise<AuthServerMetadata> {
  const resource = await fetchJson<{ authorization_servers?: string[] }>(
    `${normalizeApiUrl(apiUrl)}/.well-known/oauth-protected-resource`,
  );
  const issuer = resource.authorization_servers?.[0];
  if (!issuer) {
    throw new Error(`${apiUrl} does not advertise an authorization server.`);
  }

  // RFC 8414: insert the well-known segment between host and path.
  const issuerUrl = new URL(issuer);
  const path = issuerUrl.pathname.replace(/\/+$/, "");
  const candidates = [
    `${issuerUrl.origin}/.well-known/oauth-authorization-server${path}`,
    `${issuer.replace(/\/+$/, "")}/.well-known/oauth-authorization-server`,
  ];
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await fetchJson<AuthServerMetadata>(candidate);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Could not load authorization server metadata.");
}

const base64Url = (buffer: Buffer) => buffer.toString("base64url");

function openBrowser(url: string) {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  try {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.on("error", () => {});
    child.unref();
  } catch {
    // The URL is printed too; the user can open it by hand.
  }
}

const RESULT_PAGE = (title: string, message: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>` +
  `<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;text-align:center">` +
  `<h1 style="font-size:1.4rem">${title}</h1><p>${message}</p></body></html>`;

function waitForCallback(
  server: Server,
  expectedState: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for login to finish.")),
      LOGIN_TIMEOUT_MS,
    );
    server.on("request", (req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const finish = (ok: boolean, message: string) => {
        res.writeHead(ok ? 200 : 400, { "Content-Type": "text/html" });
        res.end(
          RESULT_PAGE(
            ok ? "You're logged in" : "Login failed",
            ok ? "You can close this tab and return to the terminal." : message,
          ),
        );
        clearTimeout(timer);
      };
      if (error) {
        const description = url.searchParams.get("error_description") ?? error;
        finish(false, description);
        reject(new Error(`Login failed: ${description}`));
      } else if (!code || state !== expectedState) {
        finish(false, "The response was missing a code or had the wrong state.");
        reject(new Error("Login failed: invalid callback."));
      } else {
        finish(true, "");
        resolve(code);
      }
    });
  });
}

function sessionFromTokens(
  apiUrl: string,
  clientId: string,
  tokenEndpoint: string,
  tokens: TokenResponse,
  previous?: StoredSession,
): StoredSession {
  return {
    apiUrl,
    clientId,
    tokenEndpoint,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? previous?.refreshToken,
    expiresAt: tokens.expires_in
      ? Date.now() + tokens.expires_in * 1000
      : undefined,
    email: previous?.email,
  };
}

export async function login(
  apiUrl: string,
  options: { onUrl?: (url: string) => void; openBrowser?: boolean } = {},
): Promise<StoredSession> {
  const metadata = await discoverAuthServer(apiUrl);
  if (!metadata.registration_endpoint) {
    throw new Error(
      "The authorization server does not support dynamic client registration.",
    );
  }

  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  try {
    const client = await fetchJson<{ client_id: string }>(
      metadata.registration_endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: "Teacharium CLI",
          redirect_uris: [redirectUri],
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          token_endpoint_auth_method: "none",
        }),
      },
    );

    const verifier = base64Url(randomBytes(32));
    const challenge = base64Url(createHash("sha256").update(verifier).digest());
    const state = base64Url(randomBytes(16));

    const authorizeUrl = new URL(metadata.authorization_endpoint);
    authorizeUrl.search = new URLSearchParams({
      response_type: "code",
      client_id: client.client_id,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
    }).toString();

    const callback = waitForCallback(server, state);
    options.onUrl?.(authorizeUrl.toString());
    if (options.openBrowser !== false) openBrowser(authorizeUrl.toString());
    const code = await callback;

    const tokens = await fetchJson<TokenResponse>(metadata.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: client.client_id,
        code_verifier: verifier,
      }),
    });

    const session = sessionFromTokens(
      normalizeApiUrl(apiUrl),
      client.client_id,
      metadata.token_endpoint,
      tokens,
    );
    saveSession(session);
    return session;
  } finally {
    server.close();
  }
}

async function refresh(session: StoredSession): Promise<StoredSession> {
  if (!session.refreshToken) {
    throw new Error("Your session has expired. Run `teacharium login` again.");
  }
  let tokens: TokenResponse;
  try {
    tokens = await fetchJson<TokenResponse>(session.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
        client_id: session.clientId,
      }),
    });
  } catch {
    throw new Error("Your session has expired. Run `teacharium login` again.");
  }
  const next = sessionFromTokens(
    session.apiUrl,
    session.clientId,
    session.tokenEndpoint,
    tokens,
    session,
  );
  saveSession(next);
  return next;
}

/**
 * Bearer token for `apiUrl`: `TEACHARIUM_TOKEN` (an organization API token,
 * for CI) wins over a stored login, which is refreshed when close to expiry.
 */
export async function getAccessToken(apiUrl: string): Promise<string> {
  const envToken = process.env.TEACHARIUM_TOKEN?.trim();
  if (envToken) return envToken;

  const session = getSession(apiUrl);
  if (!session) {
    throw new Error(
      `Not logged in to ${normalizeApiUrl(apiUrl)}. Run \`teacharium login${
        normalizeApiUrl(apiUrl) === DEFAULT_API_URL ? "" : ` --api-url ${apiUrl}`
      }\`, or set TEACHARIUM_TOKEN.`,
    );
  }
  if (session.expiresAt && session.expiresAt - EXPIRY_MARGIN_MS < Date.now()) {
    return (await refresh(session)).accessToken;
  }
  return session.accessToken;
}

export async function forceRefresh(apiUrl: string): Promise<string | null> {
  if (process.env.TEACHARIUM_TOKEN?.trim()) return null;
  const session = getSession(apiUrl);
  if (!session?.refreshToken) return null;
  return (await refresh(session)).accessToken;
}

export const DEFAULT_API_URL = "https://app.teacharium.io";

/** API URL from --api-url, then TEACHARIUM_API_URL, then production. */
export function resolveApiUrl(flag?: string): string {
  return normalizeApiUrl(
    flag || process.env.TEACHARIUM_API_URL || DEFAULT_API_URL,
  );
}
